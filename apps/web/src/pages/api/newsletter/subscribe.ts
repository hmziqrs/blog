import type { APIContext } from "astro";
import { normalizeEmail } from "../../../lib/email";
import { z } from "zod";

export const prerender = false;

const subscribeSchema = z.object({
  email: z.email("Invalid email address"),
  token: z.string().min(1, "CAPTCHA token required"),
  honeypot: z.string().max(0, "Bot detected").optional(),
  submitTime: z.number().optional(),
});

async function checkRateLimit(
  db: import("@cloudflare/workers-types").D1Database,
  ip: string,
  email: string,
): Promise<boolean> {
  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;
  const oneHourAgo = now - 60 * 60 * 1000;

  await db.prepare("DELETE FROM rate_limits WHERE timestamp < ?").bind(oneMinuteAgo).run();

  const ipCount = await db
    .prepare("SELECT COUNT(*) as count FROM rate_limits WHERE ip = ? AND timestamp > ?")
    .bind(ip, oneMinuteAgo)
    .first<{ count: number }>();

  if ((ipCount?.count ?? 0) >= 3) return false;

  const emailCount = await db
    .prepare("SELECT COUNT(*) as count FROM rate_limits WHERE email = ? AND timestamp > ?")
    .bind(email, oneHourAgo)
    .first<{ count: number }>();

  if ((emailCount?.count ?? 0) >= 2) return false;

  await db
    .prepare("INSERT INTO rate_limits (ip, email, timestamp) VALUES (?, ?, ?)")
    .bind(ip, email, now)
    .run();

  return true;
}

export async function POST(context: APIContext): Promise<Response> {
  const env = context.locals.runtime.env;

  try {
    const ip = context.request.headers.get("CF-Connecting-IP") || "unknown";

    const body = await context.request.json();
    const validated = subscribeSchema.parse(body);

    if (validated.honeypot) {
      return new Response(JSON.stringify({ message: "Subscribed" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (validated.submitTime !== undefined && Date.now() - validated.submitTime < 3000) {
      return new Response(JSON.stringify({ error: "Submit too fast" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const email = normalizeEmail(validated.email);

    const allowed = await checkRateLimit(env.DB, ip, email);
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }

    const turnstileRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: env.TURNSTILE_SECRET_KEY,
        response: validated.token,
        remoteip: ip,
      }),
    });
    const turnstileData = await turnstileRes.json<{ success: boolean }>();
    if (!turnstileData.success) {
      return new Response(JSON.stringify({ error: "CAPTCHA verification failed" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const existing = await env.DB.prepare("SELECT id, status FROM subscribers WHERE email = ?")
      .bind(email)
      .first<{ id: string; status: string }>();

    if (existing) {
      if (existing.status === "active") {
        return new Response(JSON.stringify({ error: "Already subscribed" }), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ message: "Check your email to confirm" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const id = crypto.randomUUID();
    const confirmationToken = crypto.randomUUID();
    const unsubscribeToken = crypto.randomUUID();

    await env.DB.prepare(
      "INSERT INTO subscribers (id, email, status, confirmation_token, unsubscribe_token) VALUES (?, ?, 'pending', ?, ?)",
    )
      .bind(id, email, confirmationToken, unsubscribeToken)
      .run();

    const siteUrl = "https://hmziq.rs";
    const confirmUrl = `${siteUrl}/newsletter/confirm?token=${confirmationToken}`;

    await sendConfirmationEmail(env, email, confirmUrl);

    return new Response(JSON.stringify({ message: "Check your email to confirm subscription" }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: error.issues[0].message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.error("Subscribe error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function sendConfirmationEmail(env: Env, to: string, confirmUrl: string) {
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM_ADDRESS,
      to,
      subject: "Confirm your newsletter subscription",
      html: `
        <p>Click the link below to confirm your subscription to Hmziq's blog newsletter:</p>
        <p><a href="${confirmUrl}">Confirm subscription</a></p>
        <p>If you didn't request this, ignore this email.</p>
      `,
    }),
  });
}
