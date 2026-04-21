import { generateHTML, getLatestPost } from "./newsletter-utils.ts";

// ─── Config ────────────────────────────────────────────────────────────────────

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID ?? "";
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN ?? "";
const D1_DATABASE_ID = process.env.D1_DATABASE_ID ?? "";
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const EMAIL_FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS ?? "newsletter@hmziq.rs";
const DRY_RUN = process.argv.includes("--dry-run");

// ─── D1 Client ─────────────────────────────────────────────────────────────────

async function queryD1<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/d1/database/${D1_DATABASE_ID}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql, params }),
    },
  );

  if (!response.ok) throw new Error(`D1 query failed: ${response.statusText}`);

  const data = await response.json<{
    success: boolean;
    errors: Array<{ message: string }>;
    result: Array<{ results: T[] }>;
  }>();
  if (!data.success) throw new Error(`D1 query error: ${data.errors[0].message}`);

  return data.result[0].results;
}

// ─── Email via Resend ───────────────────────────────────────────────────────────

async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<{ ok: boolean; error?: string }> {
  if (DRY_RUN) {
    console.log(`[dry-run] Would send to ${to}: ${subject}`);
    return { ok: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: EMAIL_FROM_ADDRESS, to, subject, html }),
  });

  if (!res.ok) return { ok: false, error: await res.text() };
  return { ok: true };
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN || !D1_DATABASE_ID) {
    console.error("Missing Cloudflare credentials");
    process.exit(1);
  }

  if (!RESEND_API_KEY && !DRY_RUN) {
    console.error("RESEND_API_KEY is required (or use --dry-run)");
    process.exit(1);
  }

  const post = getLatestPost();
  if (!post) {
    console.error("Could not determine latest post");
    process.exit(1);
  }

  console.log(`Latest post: "${post.title}" (${post.pubDate.toISOString()})`);

  const alreadySent = await queryD1<{ id: number }>(
    "SELECT id FROM newsletter_sent WHERE post_slug = ?",
    [post.slug],
  );
  if (alreadySent.length > 0) {
    console.log("Newsletter already sent for this post");
    process.exit(0);
  }

  const subscribers = await queryD1<{
    id: string;
    email: string;
    unsubscribe_token: string;
  }>("SELECT id, email, unsubscribe_token FROM subscribers WHERE status = 'active'");

  console.log(
    `Sending to ${subscribers.length} active subscriber(s)${DRY_RUN ? " [DRY RUN]" : ""}`,
  );

  const subject = `New Post: ${post.title}`;
  let successCount = 0;
  let failCount = 0;

  const BATCH_SIZE = 10;
  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    const batch = subscribers.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map(async (sub) => {
        const html = generateHTML(post, sub.unsubscribe_token);
        const result = await sendEmail(sub.email, subject, html);
        if (result.ok) {
          successCount++;
          if (!DRY_RUN) {
            await queryD1(
              "INSERT OR IGNORE INTO newsletter_deliveries (post_slug, subscriber_id, status, sent_at) VALUES (?, ?, 'sent', datetime('now'))",
              [post.slug, sub.id],
            );
          }
        } else {
          failCount++;
          console.error(`Failed to send to ${sub.email}: ${result.error}`);
          if (!DRY_RUN) {
            await queryD1(
              "INSERT OR IGNORE INTO newsletter_deliveries (post_slug, subscriber_id, status) VALUES (?, ?, 'failed')",
              [post.slug, sub.id],
            );
          }
        }
      }),
    );
  }

  if (!DRY_RUN) {
    await queryD1("INSERT INTO newsletter_sent (post_slug) VALUES (?)", [post.slug]);
  }

  console.log(`Done. Sent: ${successCount}, Failed: ${failCount}${DRY_RUN ? " [DRY RUN]" : ""}`);

  if (failCount > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
