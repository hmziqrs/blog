import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ─── Config ────────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const POSTS_DIR = path.join(REPO_ROOT, "content", "posts");

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID ?? "";
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN ?? "";
const D1_DATABASE_ID = process.env.D1_DATABASE_ID ?? "";
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
const EMAIL_FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS ?? "newsletter@hmziq.rs";
const SITE_URL = "https://hmziq.rs";
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

  if (!response.ok) {
    throw new Error(`D1 query failed: ${response.statusText}`);
  }

  const data = await response.json<{
    success: boolean;
    errors: Array<{ message: string }>;
    result: Array<{ results: T[] }>;
  }>();
  if (!data.success) {
    throw new Error(`D1 query error: ${data.errors[0].message}`);
  }

  return data.result[0].results;
}

// ─── Get Latest Post by pubDate ─────────────────────────────────────────────────

interface PostMeta {
  slug: string;
  title: string;
  excerpt: string;
  pubDate: Date;
}

function parsePost(filename: string): PostMeta | null {
  const slug = filename.replace(/\.md$/, "");
  const filePath = path.join(POSTS_DIR, filename);
  const content = fs.readFileSync(filePath, "utf-8");

  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return null;

  const fm = fmMatch[1];
  const titleMatch = fm.match(/title:\s*["'](.+?)["']/);
  const dateMatch = fm.match(/pubDate:\s*["']?(.+?)["']?\n/);

  const title = titleMatch?.[1] ?? "New Post";
  const pubDate = dateMatch ? new Date(dateMatch[1].trim()) : new Date(0);
  const body = content.slice(fmMatch[0].length).trim();
  const excerpt = body.slice(0, 200).replace(/\n/g, " ") + "…";

  return { slug, title, excerpt, pubDate };
}

function getLatestPost(): PostMeta | null {
  if (!fs.existsSync(POSTS_DIR)) {
    console.error("Posts directory not found");
    return null;
  }

  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));
  if (files.length === 0) {
    console.error("No posts found");
    return null;
  }

  const posts = files.map(parsePost).filter((p): p is PostMeta => p !== null);
  return posts.toSorted((a, b) => b.pubDate.getTime() - a.pubDate.getTime())[0] ?? null;
}

// ─── Generate Newsletter HTML ───────────────────────────────────────────────────

function generateHTML(post: PostMeta, unsubscribeToken: string): string {
  const postUrl = `${SITE_URL}/posts/${post.slug}`;
  const unsubscribeUrl = `${SITE_URL}/newsletter/unsubscribe?token=${unsubscribeToken}`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>New Post: ${post.title}</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
    <h2 style="color: #333; margin-top: 0;">New Post Published</h2>
    <h3 style="color: #666; margin-bottom: 10px;">${post.title}</h3>
    <p style="color: #555; line-height: 1.6;">${post.excerpt}</p>
    <a href="${postUrl}" style="display: inline-block; background: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Read Full Post</a>
  </div>
  <p style="color: #999; font-size: 12px; margin-top: 30px;">
    You're receiving this because you subscribed to Hmziq's blog newsletter.
    <a href="${unsubscribeUrl}" style="color: #999;">Unsubscribe</a>
  </p>
</body>
</html>`;
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
    body: JSON.stringify({
      from: EMAIL_FROM_ADDRESS,
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: text };
  }
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
