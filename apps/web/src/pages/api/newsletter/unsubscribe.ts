import type { APIContext } from "astro";
import { z } from "zod";

export const prerender = false;

const unsubscribeSchema = z.object({
  token: z.string().min(1, "Unsubscribe token required"),
});

async function checkRateLimit(
  db: import("@cloudflare/workers-types").D1Database,
  ip: string,
): Promise<boolean> {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;

  await db.prepare("DELETE FROM rate_limits WHERE timestamp < ?").bind(oneHourAgo).run();

  const count = await db
    .prepare("SELECT COUNT(*) as count FROM rate_limits WHERE ip = ? AND timestamp > ?")
    .bind(ip, oneHourAgo)
    .first<{ count: number }>();

  if ((count?.count ?? 0) >= 3) return false;

  await db.prepare("INSERT INTO rate_limits (ip, timestamp) VALUES (?, ?)").bind(ip, now).run();

  return true;
}

export async function POST(context: APIContext): Promise<Response> {
  const env = context.locals.runtime.env;
  const ip = context.request.headers.get("CF-Connecting-IP") || "unknown";

  const contentType = context.request.headers.get("Content-Type") ?? "";
  if (!contentType.includes("application/json")) {
    return new Response(JSON.stringify({ error: "Content-Type must be application/json" }), {
      status: 415,
      headers: { "Content-Type": "application/json" },
    });
  }

  const allowed = await checkRateLimit(env.DB, ip);
  if (!allowed) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await context.request.json();
    const validated = unsubscribeSchema.parse(body);
    return await processUnsubscribe(env, validated.token);
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

export async function GET(context: APIContext): Promise<Response> {
  const env = context.locals.runtime.env;
  const ip = context.request.headers.get("CF-Connecting-IP") || "unknown";

  const allowed = await checkRateLimit(env.DB, ip);
  if (!allowed) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  const token = new URL(context.request.url).searchParams.get("token");
  if (!token) {
    return new Response(JSON.stringify({ error: "Token required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  return await processUnsubscribe(env, token);
}

async function processUnsubscribe(env: Env, token: string): Promise<Response> {
  const subscriber = await env.DB.prepare(
    "SELECT id FROM subscribers WHERE unsubscribe_token = ? AND status = 'active'",
  )
    .bind(token)
    .first<{ id: string }>();

  if (!subscriber) {
    return new Response(JSON.stringify({ error: "Invalid unsubscribe token" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  await env.DB.prepare("DELETE FROM subscribers WHERE id = ?").bind(subscriber.id).run();

  return new Response(JSON.stringify({ message: "Successfully unsubscribed" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
