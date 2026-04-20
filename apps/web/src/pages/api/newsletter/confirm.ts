import type { APIContext } from "astro";

export const prerender = false;

export async function GET(context: APIContext): Promise<Response> {
  const env = context.locals.runtime.env;
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
