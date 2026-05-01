import { Hono } from "hono";
import { z } from "zod";
import type { Bindings } from "../../../env";
import { normalizeEmail } from "../../../lib/email";
import { checkSubscribeRateLimit } from "../../../lib/rate-limit";
import { deriveUnsubscribeToken, hashToken } from "../../../lib/tokens";

const subscribeSchema = z.object({
  email: z.email("Invalid email address"),
  token: z.string().min(1, "CAPTCHA token required"),
  honeypot: z.string().optional(),
});

const app = new Hono<{ Bindings: Bindings }>();

app.post("/", async (c) => {
  // L4: Proper Content-Type parsing instead of substring check
  const contentType = c.req.header("Content-Type") ?? "";
  if (contentType.split(";")[0].trim() !== "application/json") {
    return c.json({ error: "Content-Type must be application/json" }, 415);
  }

  try {
    // M5: Guard against empty or test Turnstile secret keys
    const turnstileSecret = c.env.TURNSTILE_SECRET_KEY;
    if (!turnstileSecret || /^[123]x0000000000000000000000000000000AA$/.test(turnstileSecret)) {
      return c.json({ error: "Service misconfigured" }, 503);
    }

    // L3: Honeypot schema now uses z.string().optional() so non-empty
    //     values reach the silent-201 branch instead of being rejected by Zod
    const body = await c.req.json();
    const validated = subscribeSchema.parse(body);

    if (validated.honeypot) {
      return c.json({ message: "Subscribed" }, 201);
    }

    // L5: Reject missing CF-Connecting-IP in production
    const ip = c.req.header("CF-Connecting-IP");
    if (!ip && c.env.ENVIRONMENT === "production") {
      return c.json({ error: "Missing required headers" }, 400);
    }
    const clientIp = ip ?? "unknown";

    // Turnstile verification (before rate limit — L8 fix)
    const turnstileRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: turnstileSecret,
        response: validated.token,
        remoteip: clientIp,
      }),
    });
    const turnstileData = await turnstileRes.json<{ success: boolean }>();
    if (!turnstileData.success) {
      return c.json({ error: "CAPTCHA verification failed" }, 400);
    }

    // L8: Rate limit check AFTER Turnstile so failed CAPTCHAs don't burn budget
    const email = normalizeEmail(validated.email);
    const allowed = await checkSubscribeRateLimit(c.env.DB, clientIp, email);
    if (!allowed) {
      return c.json({ error: "Too many requests" }, 429);
    }

    // M1: Always return 201 to avoid email enumeration
    const existing = await c.env.DB.prepare("SELECT id, status FROM subscribers WHERE email = ?")
      .bind(email)
      .first<{ id: string; status: string }>();

    if (existing) {
      if (existing.status === "active") {
        return c.json({ message: "Subscribed" }, 201);
      }
      // Re-activate unsubscribed user
      await c.env.DB.prepare(
        "UPDATE subscribers SET status = 'active', unsubscribed_at = NULL WHERE id = ?",
      )
        .bind(existing.id)
        .run();
      return c.json({ message: "Subscribed" }, 201);
    }

    const id = crypto.randomUUID();
    const token = await deriveUnsubscribeToken(c.env.NEWSLETTER_SEND_SECRET, id);
    const tokenHash = await hashToken(token);

    // ON CONFLICT(email) handles the race where two concurrent requests both
    // pass the SELECT above and both reach INSERT with the same email.
    await c.env.DB.prepare(
      "INSERT INTO subscribers (id, email, status, unsubscribe_token_hash) VALUES (?, ?, 'active', ?) ON CONFLICT(email) DO NOTHING",
    )
      .bind(id, email, tokenHash)
      .run();

    return c.json({ message: "Subscribed" }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: error.issues[0]?.message ?? "Validation error" }, 400);
    }
    // L1: Avoid leaking PII in error logs
    console.error("Subscribe error:", error instanceof Error ? error.message : "unknown");
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default app;
