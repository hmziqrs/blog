import type { APIContext } from "astro";
import { z } from "zod";

export const prerender = false;

const unsubscribeSchema = z.object({
  token: z.string().min(1, "Unsubscribe token required"),
});

export async function POST(context: APIContext): Promise<Response> {
  const env = context.locals.runtime.env;

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
