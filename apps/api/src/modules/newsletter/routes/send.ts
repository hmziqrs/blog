import { Hono } from "hono";
import type { Bindings } from "../../../env";
import type { NewsletterMessage } from "../queue";

interface PostMeta {
  slug: string;
  title: string;
  excerpt: string;
}

function timingSafeEqual(a: string, b: string): boolean {
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
  if (contentType.split(";")[0].trim() !== "application/json") {
    return c.json({ error: "Content-Type must be application/json" }, 415);
  }

  try {
    const body = await c.req.json<PostMeta>();
    const post = body;

    if (!post.slug || !post.title || !post.excerpt) {
      return c.json({ error: "Missing slug, title, or excerpt" }, 400);
    }

    if (post.slug.length > 256 || post.title.length > 256 || post.excerpt.length > 4096) {
      return c.json({ error: "Field too long" }, 400);
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug)) {
      return c.json({ error: "Invalid slug format" }, 400);
    }

    // INSERT first with ON CONFLICT to prevent duplicate sends under concurrency.
    // If the row already exists, meta.changes will be 0 and we bail out before enqueuing.
    const insertResult = await c.env.DB.prepare(
      "INSERT INTO newsletter_sent (post_slug) VALUES (?) ON CONFLICT (post_slug) DO NOTHING",
    )
      .bind(post.slug)
      .run();

    if (insertResult.meta.changes === 0) {
      return c.json({ message: "Already sent" }, 200);
    }

    const subscribers = await c.env.DB.prepare(
      "SELECT id, email, unsubscribe_token FROM subscribers WHERE status = 'active'",
    ).all<{ id: string; email: string; unsubscribe_token: string }>();

    const rows = subscribers.results ?? [];

    // Use sendBatch for fewer queue operations and better throughput.
    // sendBatch is hard-capped at 100 messages and 256 KB total per call,
    // so chunk explicitly — required for any subscriber count > 100.
    const messages: MessageSendRequest<NewsletterMessage>[] = rows.map((sub) => ({
      body: {
        postSlug: post.slug,
        postTitle: post.title,
        postExcerpt: post.excerpt,
        subscriberId: sub.id,
        subscriberEmail: sub.email,
        unsubscribeToken: sub.unsubscribe_token,
      },
    }));

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
