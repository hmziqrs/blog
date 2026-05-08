import { Hono } from "hono";
import type { Bindings } from "@/src/env";
import type { NewsletterMessage } from "../queue";
import { deriveUnsubscribeToken } from "@/src/lib/tokens";

interface SendRequest {
  slug: string;
  subject: string;
  htmlBody: string;
  force?: boolean;
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const aa = new TextEncoder().encode(a);
  const bb = new TextEncoder().encode(b);
  let result = 0;
  for (let i = 0; i < aa.length; i++) {
    result |= aa[i]! ^ bb[i]!;
  }
  return result === 0;
}

const app = new Hono<{ Bindings: Bindings }>();

app.post("/", async (c) => {
  const secret = c.req.header("X-Send-Secret");
  if (!secret || !timingSafeEqual(secret, c.env.NEWSLETTER_SEND_SECRET)) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const contentType = c.req.header("Content-Type") ?? "";
  const mimeType = contentType.split(";").at(0) ?? "";
  if (mimeType.trim() !== "application/json") {
    return c.json({ error: "Content-Type must be application/json" }, 415);
  }

  try {
    const body = await c.req.json<SendRequest>();

    if (!body.slug || !body.subject || !body.htmlBody) {
      return c.json({ error: "Missing slug, subject, or htmlBody" }, 400);
    }

    if (body.slug.length > 256 || body.subject.length > 256 || body.htmlBody.length > 100_000) {
      return c.json({ error: "Field too long" }, 400);
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.slug)) {
      return c.json({ error: "Invalid slug format" }, 400);
    }

    if (body.force) {
      await c.env.DB.prepare("DELETE FROM newsletter_sent WHERE issue_slug = ?")
        .bind(body.slug)
        .run();
    }

    const insertResult = await c.env.DB.prepare(
      "INSERT INTO newsletter_sent (issue_slug) VALUES (?) ON CONFLICT (issue_slug) DO NOTHING",
    )
      .bind(body.slug)
      .run();

    if (insertResult.meta.changes === 0) {
      return c.json({ message: "Already sent" }, 200);
    }

    const subscribers = await c.env.DB.prepare(
      "SELECT id, email FROM subscribers WHERE status = 'active'",
    ).all<{ id: string; email: string }>();

    const rows = subscribers.results ?? [];

    const messages: MessageSendRequest<NewsletterMessage>[] = [];
    for (const sub of rows) {
      const token = await deriveUnsubscribeToken(c.env.NEWSLETTER_SEND_SECRET, sub.id);
      messages.push({
        body: {
          issueSlug: body.slug,
          subject: body.subject,
          htmlBody: body.htmlBody,
          subscriberId: sub.id,
          subscriberEmail: sub.email,
          unsubscribeToken: token,
        },
      });
    }

    const SEND_BATCH_CHUNK = 100;
    for (let i = 0; i < messages.length; i += SEND_BATCH_CHUNK) {
      await c.env.NEWSLETTER_QUEUE.sendBatch(messages.slice(i, i + SEND_BATCH_CHUNK));
    }

    return c.json({ queued: messages.length }, 200);
  } catch (error) {
    console.error("Newsletter send error:", error instanceof Error ? error.message : "unknown");
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default app;
