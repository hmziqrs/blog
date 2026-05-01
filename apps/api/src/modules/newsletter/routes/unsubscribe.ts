import { Hono } from "hono";
import { z } from "zod";
import type { Bindings } from "../../../env";
import { checkUnsubscribeRateLimit } from "../../../lib/rate-limit";

const unsubscribeSchema = z.object({
  token: z.string().min(1, "Unsubscribe token required"),
});

const app = new Hono<{ Bindings: Bindings }>();

async function processUnsubscribe(
  db: Bindings["DB"],
  token: string,
): Promise<{ error: string; status: 400 | 404 } | { message: string; status: 200 }> {
  const subscriber = await db
    .prepare("SELECT id FROM subscribers WHERE unsubscribe_token = ? AND status = 'active'")
    .bind(token)
    .first<{ id: string }>();

  if (!subscriber) {
    return { error: "Invalid unsubscribe token", status: 404 };
  }

  await db
    .prepare(
      "UPDATE subscribers SET status='unsubscribed', unsubscribed_at=datetime('now') WHERE id = ?",
    )
    .bind(subscriber.id)
    .run();

  return { message: "Successfully unsubscribed", status: 200 };
}

app.post("/", async (c) => {
  const contentType = c.req.header("Content-Type") ?? "";
  if (contentType.split(";")[0].trim() !== "application/json") {
    return c.json({ error: "Content-Type must be application/json" }, 415);
  }

  const ip = c.req.header("CF-Connecting-IP");
  if (!ip && c.env.ENVIRONMENT === "production") {
    return c.json({ error: "Missing required headers" }, 400);
  }
  const clientIp = ip ?? "unknown";

  const allowed = await checkUnsubscribeRateLimit(c.env.RATE_LIMIT_KV, clientIp);
  if (!allowed) {
    return c.json({ error: "Too many requests" }, 429);
  }

  try {
    const body = await c.req.json();
    const validated = unsubscribeSchema.parse(body);
    const result = await processUnsubscribe(c.env.DB, validated.token);
    return c.json(
      "error" in result ? { error: result.error } : { message: result.message },
      result.status,
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: error.issues[0]?.message ?? "Validation error" }, 400);
    }
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default app;
