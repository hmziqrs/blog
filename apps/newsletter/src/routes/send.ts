import { Hono } from "hono";
import type { Bindings } from "../env";
import { escapeHTML } from "../lib/email";
import { sendMail } from "../lib/mailer";

interface PostMeta {
  slug: string;
  title: string;
  excerpt: string;
}

function generateHTML(post: PostMeta, unsubscribeToken: string, siteUrl = "https://hmziq.rs"): string {
  const postUrl = `${siteUrl}/posts/${encodeURIComponent(post.slug)}`;
  const unsubscribeUrl = `${siteUrl}/newsletter/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;

  const safeTitle = escapeHTML(post.title);
  const safeExcerpt = escapeHTML(post.excerpt);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>New Post: ${safeTitle}</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
    <h2 style="color: #333; margin-top: 0;">New Post Published</h2>
    <h3 style="color: #666; margin-bottom: 10px;">${safeTitle}</h3>
    <p style="color: #555; line-height: 1.6;">${safeExcerpt}</p>
    <a href="${postUrl}" style="display: inline-block; background: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Read Full Post</a>
  </div>
  <p style="color: #999; font-size: 12px; margin-top: 30px;">
    You're receiving this because you subscribed to Hmziq's blog newsletter.
    <a href="${unsubscribeUrl}" style="color: #999;">Unsubscribe</a>
  </p>
</body>
</html>`;
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

    const alreadySent = await c.env.DB.prepare(
      "SELECT id FROM newsletter_sent WHERE post_slug = ?",
    )
      .bind(post.slug)
      .first<{ id: number }>();

    if (alreadySent) {
      return c.json({ message: "Already sent" }, 200);
    }

    const subscribers = await c.env.DB.prepare(
      "SELECT id, email, unsubscribe_token FROM subscribers WHERE status = 'active'",
    ).all<{ id: string; email: string; unsubscribe_token: string }>();

    const rows = subscribers.results ?? [];
    let sent = 0;
    let failed = 0;

    const BATCH_SIZE = 10;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (sub) => {
          const html = generateHTML(post, sub.unsubscribe_token);
          try {
            await sendMail(c.env.SEND_EMAIL, {
              from: c.env.EMAIL_FROM_ADDRESS,
              to: sub.email,
              subject: `New Post: ${post.title}`,
              html,
            });
            sent++;
            await c.env.DB.prepare(
              "INSERT OR IGNORE INTO newsletter_deliveries (post_slug, subscriber_id, status, sent_at) VALUES (?, ?, 'sent', datetime('now'))",
            )
              .bind(post.slug, sub.id)
              .run();
          } catch {
            failed++;
            await c.env.DB.prepare(
              "INSERT OR IGNORE INTO newsletter_deliveries (post_slug, subscriber_id, status) VALUES (?, ?, 'failed')",
            )
              .bind(post.slug, sub.id)
              .run();
          }
        }),
      );
    }

    await c.env.DB.prepare("INSERT INTO newsletter_sent (post_slug) VALUES (?)").bind(post.slug).run();

    return c.json({ sent, failed }, 200);
  } catch (error) {
    console.error("Newsletter send error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export default app;
