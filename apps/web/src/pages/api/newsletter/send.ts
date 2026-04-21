import type { APIContext } from "astro";
import { sendMail } from "../../../lib/mailer";
import { escapeHTML } from "../../../lib/email";

export const prerender = false;

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

export async function POST(context: APIContext): Promise<Response> {
  const env = context.locals.runtime.env;

  const secret = context.request.headers.get("X-Send-Secret");
  if (!secret || secret !== env.NEWSLETTER_SEND_SECRET) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const contentType = context.request.headers.get("Content-Type") ?? "";
  if (!contentType.includes("application/json")) {
    return new Response(JSON.stringify({ error: "Content-Type must be application/json" }), {
      status: 415,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await context.request.json();
    const post = body as PostMeta;
    if (!post.slug || !post.title || !post.excerpt) {
      return new Response(JSON.stringify({ error: "Missing slug, title, or excerpt" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (post.slug.length > 256 || post.title.length > 256 || post.excerpt.length > 4096) {
      return new Response(JSON.stringify({ error: "Field too long" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const alreadySent = await env.DB.prepare("SELECT id FROM newsletter_sent WHERE post_slug = ?")
      .bind(post.slug)
      .first<{ id: number }>();

    if (alreadySent) {
      return new Response(JSON.stringify({ message: "Already sent" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const subscribers = await env.DB.prepare(
      "SELECT id, email, unsubscribe_token FROM subscribers WHERE status = 'active'",
    ).all<{ id: string; email: string; unsubscribe_token: string }>();

    const rows = subscribers.results ?? [];
    let sent = 0;
    let failed = 0;

    const BATCH_SIZE = 10;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (sub: { id: string; email: string; unsubscribe_token: string }) => {
          const html = generateHTML(post, sub.unsubscribe_token);
          try {
            await sendMail(env.SEND_EMAIL, {
              from: env.EMAIL_FROM_ADDRESS,
              to: sub.email,
              subject: `New Post: ${post.title}`,
              html,
            });
            sent++;
            await env.DB.prepare(
              "INSERT OR IGNORE INTO newsletter_deliveries (post_slug, subscriber_id, status, sent_at) VALUES (?, ?, 'sent', datetime('now'))",
            )
              .bind(post.slug, sub.id)
              .run();
          } catch {
            failed++;
            await env.DB.prepare(
              "INSERT OR IGNORE INTO newsletter_deliveries (post_slug, subscriber_id, status) VALUES (?, ?, 'failed')",
            )
              .bind(post.slug, sub.id)
              .run();
          }
        }),
      );
    }

    await env.DB.prepare("INSERT INTO newsletter_sent (post_slug) VALUES (?)").bind(post.slug).run();

    return new Response(JSON.stringify({ sent, failed }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Newsletter send error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
