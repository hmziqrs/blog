import { z } from "zod";
import type { D1Database } from "@cloudflare/workers-types";

const unsubscribeSchema = z.object({
  token: z.string().min(1, "Unsubscribe token required"),
});

interface Env {
  DB: D1Database;
}

export async function POST({ request, env }: { request: Request; env: Env }) {
  try {
    const body = await request.json();
    const validated = unsubscribeSchema.parse(body);

    // Find subscriber by unsubscribe token
    const subscriber = await env.DB
      .prepare("SELECT id, email FROM subscribers WHERE unsubscribe_token = ?")
      .bind(validated.token)
      .first();

    if (!subscriber) {
      return new Response(JSON.stringify({ error: "Invalid unsubscribe token" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Remove subscriber
    await env.DB
      .prepare("DELETE FROM subscribers WHERE id = ?")
      .bind(subscriber.id)
      .run();

    // Optionally add to blacklist
    await env.DB
      .prepare("INSERT OR IGNORE INTO blacklist (email, reason) VALUES (?, ?)")
      .bind(subscriber.email, "User unsubscribed")
      .run();

    return new Response(JSON.stringify({ message: "Successfully unsubscribed" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
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
