import { z } from "zod";
import type { D1Database } from "@cloudflare/workers-types";

const subscribeSchema = z.object({
  email: z.string().email("Invalid email address"),
  token: z.string().min(1, "CAPTCHA token required"),
});

interface Env {
  DB: D1Database;
  TURNSTILE_SECRET_KEY: string;
  EMAIL_FROM_ADDRESS: string;
}

// Rate limiting: 3 requests per minute per IP
async function checkRateLimit(
  db: D1Database,
  ip: string,
): Promise<boolean> {
  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;

  // Clean up old entries
  await db
    .prepare("DELETE FROM rate_limits WHERE timestamp < ?")
    .bind(oneMinuteAgo)
    .run();

  // Count recent requests from this IP
  const result = await db
    .prepare("SELECT COUNT(*) as count FROM rate_limits WHERE ip = ?")
    .bind(ip)
    .first();

  const count = result?.count as number || 0;

  if (count >= 3) {
    return false;
  }

  // Record this request
  await db
    .prepare("INSERT INTO rate_limits (ip, timestamp) VALUES (?, ?)")
    .bind(ip, now)
    .run();

  return true;
}

export async function POST({ request, env }: { request: Request; env: Env }) {
  try {
    // Get client IP for rate limiting
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";

    // Check rate limit
    const allowed = await checkRateLimit(env.DB, ip);
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const validated = subscribeSchema.parse(body);

    // Verify Turnstile CAPTCHA
    const turnstileResponse = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: env.TURNSTILE_SECRET_KEY,
          response: validated.token,
        }),
      },
    );

    const turnstileResult = await turnstileResponse.json();
    if (!turnstileResult.success) {
      return new Response(JSON.stringify({ error: "CAPTCHA verification failed" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check blacklist
    const blacklisted = await env.DB
      .prepare("SELECT email FROM blacklist WHERE email = ?")
      .bind(validated.email.toLowerCase())
      .first();

    if (blacklisted) {
      return new Response(JSON.stringify({ error: "Email is not allowed" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check for existing subscription
    const existing = await env.DB
      .prepare("SELECT id FROM subscribers WHERE email = ?")
      .bind(validated.email.toLowerCase())
      .first();

    if (existing) {
      return new Response(JSON.stringify({ error: "Already subscribed" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Generate unique tokens
    const id = crypto.randomUUID();
    const unsubscribeToken = crypto.randomUUID();

    // Store subscriber
    await env.DB
      .prepare(
        "INSERT INTO subscribers (id, email, unsubscribe_token) VALUES (?, ?, ?)",
      )
      .bind(id, validated.email.toLowerCase(), unsubscribeToken)
      .run();

    // Send welcome email (implementation depends on Cloudflare Email Sending API)
    // TODO: Implement email sending

    return new Response(
      JSON.stringify({ message: "Successfully subscribed" }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: error.issues[0].message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
