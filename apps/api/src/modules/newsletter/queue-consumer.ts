import type { Bindings } from "../../env";
import type { NewsletterMessage } from "./queue";
import { sendMail } from "../../lib/mailer";
import { escapeHTML } from "../../lib/email";
import { deriveUnsubscribeToken } from "../../lib/tokens";

const MAX_RETRIES = 5;

function generateHTML(message: NewsletterMessage, siteUrl: string): string {
  const unsubscribeUrl = `${siteUrl}/newsletter/unsubscribe?token=${encodeURIComponent(message.unsubscribeToken)}`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${escapeHTML(message.subject)}</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
    ${message.htmlBody}
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
      const sub = await env.DB.prepare(
        "SELECT id FROM subscribers WHERE id = ? AND status = 'active'",
      )
        .bind(msg.body.subscriberId)
        .first<{ id: string }>();

      if (!sub) {
        msg.ack();
        continue;
      }

      const token = await deriveUnsubscribeToken(env.NEWSLETTER_SEND_SECRET, msg.body.subscriberId);

      const html = generateHTML({ ...msg.body, unsubscribeToken: token }, env.SITE_URL);
      await sendMail(env.SEND_EMAIL, {
        from: env.EMAIL_FROM_ADDRESS,
        to: msg.body.subscriberEmail,
        subject: msg.body.subject,
        html,
      });

      await env.DB.prepare(
        "INSERT OR IGNORE INTO newsletter_deliveries (issue_slug, subscriber_id, status, sent_at) VALUES (?, ?, 'sent', datetime('now'))",
      )
        .bind(msg.body.issueSlug, msg.body.subscriberId)
        .run();

      msg.ack();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "unknown";
      console.error(
        `Queue delivery failed for ${msg.body.subscriberEmail} (attempt ${msg.attempts}): ${errorMsg}`,
      );

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
