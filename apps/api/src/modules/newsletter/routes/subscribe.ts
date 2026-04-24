import { Hono } from "hono";
import { z } from "zod";
import type { Bindings } from "../../../env";
import { normalizeEmail } from "../../../lib/email";
import { checkSubscribeRateLimit } from "../../../lib/rate-limit";

const subscribeSchema = z.object({
  email: z.email("Invalid email address"),
  token: z.string().min(1, "CAPTCHA token required"),
  honeypot: z.string().max(0, "Bot detected").optional(),
  submitTime: z.number().optional(),
});

const app = new Hono<{ Bindings: Bindings }>();

app.post("/", async (c) => {
  const contentType = c.req.header("Content-Type") ?? "";
  if (!contentType.includes("application/json")) {
    return c.json({ error: "Content-Type must be application/json" }, 415);
  }

  try {
    const ip = c.req.header("CF-Connecting-IP") ?? "unknown";
    const body = await c.req.json();
    const validated = subscribeSchema.parse(body);

    if (validated.honeypot) {
      return c.json({ message: "Subscribed" }, 201);
    }

    if (validated.submitTime !== undefined && Date.now() - validated.submitTime < 3000) {
      return c.json({ error: "Submit too fast" }, 400);
    }

    const email = normalizeEmail(validated.email);

    const allowed = await checkSubscribeRateLimit(c.env.DB, ip, email);
    if (!allowed) {
      return c.json({ error: "Too many requests" }, 429);
    }

    const turnstileRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: c.env.TURNSTILE_SECRET_KEY,
        response: validated.token,
        remoteip: ip,
      }),
    });
    const turnstileData = await turnstileRes.json<{ success: boolean }>();
    if (!turnstileData.success) {
      return c.json({ error: "CAPTCHA verification failed" }, 400);
    }

    const existing = await c.env.DB.prepare("SELECT id, status FROM subscribers WHERE email = ?")
      .bind(email)
      .first<{ id: string; status: string }>();

    if (existing?.status === "active") {
      return c.json({ error: "Already subscribed" }, 409);
    }

    const id = crypto.randomUUID();
    const unsubscribeToken = crypto.randomUUID();

    await c.env.DB.prepare(
      "INSERT INTO subscribers (id, email, status, unsubscribe_token) VALUES (?, ?, 'active', ?)",
    )
      .bind(id, email, unsubscribeToken)
      .run();

    return c.json({ message: "Subscribed" }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: error.issues[0]?.message ?? "Validation error" }, 400);
    }
    console.error("Subscribe error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default app;
