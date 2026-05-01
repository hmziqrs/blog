import type { Bindings } from "../../env";
import type { NewsletterMessage } from "./queue";
import { sendMail } from "../../lib/mailer";
import { escapeHTML } from "../../lib/email";
import { deriveUnsubscribeToken } from "../../lib/tokens";

// `MessageBatch` and `ExecutionContext` are global ambient types from
// @cloudflare/workers-types — no explicit import needed.

const MAX_RETRIES = 5;

function generateHTML(post: NewsletterMessage, siteUrl: string): string {
  const postUrl = `${siteUrl}/posts/${encodeURIComponent(post.postSlug)}`;
  const unsubscribeUrl = `${siteUrl}/newsletter/unsubscribe?token=${encodeURIComponent(post.unsubscribeToken)}`;
  const safeTitle = escapeHTML(post.postTitle);
  const safeExcerpt = escapeHTML(post.postExcerpt);

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

export async function handleQueueBatch(
  batch: MessageBatch<NewsletterMessage>,
  env: Bindings,
  _ctx: ExecutionContext,
): Promise<void> {
  for (const msg of batch.messages) {
    try {
      // Verify subscriber still active
      const sub = await env.DB.prepare(
        "SELECT id FROM subscribers WHERE id = ? AND status = 'active'",
      )
        .bind(msg.body.subscriberId)
        .first<{ id: string }>();

      if (!sub) {
        msg.ack();
        continue;
      }

      // Derive token deterministically (L6: don't rely on message token)
      const token = await deriveUnsubscribeToken(env.NEWSLETTER_SEND_SECRET, msg.body.subscriberId);

      // Send email
      const html = generateHTML({ ...msg.body, unsubscribeToken: token }, env.SITE_URL);
      await sendMail(env.SEND_EMAIL, {
        from: env.EMAIL_FROM_ADDRESS,
        to: msg.body.subscriberEmail,
        subject: `New Post: ${msg.body.postTitle}`,
        html,
      });

      // Record delivery
      await env.DB.prepare(
        "INSERT OR IGNORE INTO newsletter_deliveries (post_slug, subscriber_id, status, sent_at) VALUES (?, ?, 'sent', datetime('now'))",
      )
        .bind(msg.body.postSlug, msg.body.subscriberId)
        .run();

      msg.ack();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "unknown";
      console.error(
        `Queue delivery failed for ${msg.body.subscriberEmail} (attempt ${msg.attempts}): ${errorMsg}`,
      );

      // M6: After max retries, blacklist and ack to prevent infinite churn
      if (msg.attempts >= MAX_RETRIES) {
        console.error(`Max retries exceeded for ${msg.body.subscriberEmail}; blacklisting`);
        await env.DB.prepare("INSERT OR IGNORE INTO blacklist (email, reason) VALUES (?, ?)")
          .bind(msg.body.subscriberEmail, "permanent_delivery_failure")
          .run();
        msg.ack();
      } else {
        msg.retry();
      }
    }
  }
}
