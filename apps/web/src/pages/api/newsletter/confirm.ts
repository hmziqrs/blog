import type { APIContext } from "astro";

export const prerender = false;

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

  if ((count?.count ?? 0) >= 5) return false;

  await db.prepare("INSERT INTO rate_limits (ip, timestamp) VALUES (?, ?)").bind(ip, now).run();

  return true;
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

  const subscriber = await env.DB.prepare(
    "SELECT id FROM subscribers WHERE confirmation_token = ? AND status = 'pending'",
  )
    .bind(token)
    .first<{ id: string }>();

  if (!subscriber) {
    return new Response(JSON.stringify({ error: "Invalid or expired confirmation token" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  await env.DB.prepare(
    "UPDATE subscribers SET status = 'active', confirmation_token = NULL WHERE id = ?",
  )
    .bind(subscriber.id)
    .run();

  return new Response(JSON.stringify({ message: "Subscription confirmed" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
