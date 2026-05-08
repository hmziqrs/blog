import { Hono } from "hono";
import { z } from "zod";
import type { Bindings } from "../../../env";
import { checkUnsubscribeRateLimit } from "../../../lib/rate-limit";
import { hashToken } from "../../../lib/tokens";

const unsubscribeSchema = z.object({
  token: z.string().min(1, "Unsubscribe token required"),
});

const app = new Hono<{ Bindings: Bindings }>();

async function processUnsubscribe(
  db: Bindings["DB"],
  token: string,
): Promise<{ error: string; status: 400 | 404 } | { message: string; status: 200 }> {
  const tokenHash = await hashToken(token);
  const subscriber = await db
    .prepare("SELECT id FROM subscribers WHERE unsubscribe_token_hash = ? AND status = 'active'")
    .bind(tokenHash)
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

app.get("/", async (c) => {
  const token = c.req.query("token");
  if (!token) {
    return c.json({ error: "No unsubscribe token provided" }, 400);
  }

  const ip = c.req.header("CF-Connecting-IP");
  if (!ip && c.env.ENVIRONMENT === "production") {
    return c.json({ error: "Missing required headers" }, 400);
  }
  const clientIp = ip ?? "unknown";

  const rateLimit = await checkUnsubscribeRateLimit(c.env.RATE_LIMIT_KV, clientIp);
  if (!rateLimit.allowed) {
    return c.json({ error: "Too many requests", retryAfter: rateLimit.retryAfterSec }, 429, {
      "Retry-After": String(rateLimit.retryAfterSec),
    });
  }

  const result = await processUnsubscribe(c.env.DB, token);
  return c.json(
    "error" in result ? { error: result.error } : { message: result.message },
    result.status,
  );
});

app.post("/", async (c) => {
  const contentType = c.req.header("Content-Type") ?? "";
  const mimeType = contentType.split(";").at(0) ?? "";
  if (mimeType.trim() !== "application/json") {
    return c.json({ error: "Content-Type must be application/json" }, 415);
  }

  const ip = c.req.header("CF-Connecting-IP");
  if (!ip && c.env.ENVIRONMENT === "production") {
    return c.json({ error: "Missing required headers" }, 400);
  }
  const clientIp = ip ?? "unknown";

  const rateLimit = await checkUnsubscribeRateLimit(c.env.RATE_LIMIT_KV, clientIp);
  if (!rateLimit.allowed) {
    return c.json({ error: "Too many requests", retryAfter: rateLimit.retryAfterSec }, 429, {
      "Retry-After": String(rateLimit.retryAfterSec),
    });
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
