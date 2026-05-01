import { Hono } from "hono";
import type { Bindings } from "../../../env";
import type { NewsletterMessage } from "../queue";

interface PostMeta {
  slug: string;
  title: string;
  excerpt: string;
}

const app = new Hono<{ Bindings: Bindings }>();

app.post("/", async (c) => {
  const secret = c.req.header("X-Send-Secret");
  if (!secret || secret !== c.env.NEWSLETTER_SEND_SECRET) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const contentType = c.req.header("Content-Type") ?? "";
  if (!contentType.includes("application/json")) {
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

    const alreadySent = await c.env.DB.prepare("SELECT id FROM newsletter_sent WHERE post_slug = ?")
      .bind(post.slug)
      .first<{ id: number }>();

    if (alreadySent) {
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

    await c.env.DB.prepare("INSERT INTO newsletter_sent (post_slug) VALUES (?)")
      .bind(post.slug)
      .run();

    return c.json({ queued: messages.length }, 200);
  } catch (error) {
    console.error("Newsletter send error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default app;
