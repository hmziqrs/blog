import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ─── Config ────────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const CONTENT_DIR = path.join(REPO_ROOT, "content");
const POSTS_DIR = path.join(CONTENT_DIR, "posts");
const DB_PATH = path.join(REPO_ROOT, "data.db");

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID ?? "";
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN ?? "";
const D1_DATABASE_ID = process.env.D1_DATABASE_ID ?? "";
const EMAIL_FROM_ADDRESS = process.env.EMAIL_FROM_ADDRESS ?? "newsletter@blog.hmziq.rs";

// ─── D1 Client ─────────────────────────────────────────────────────────────────

async function queryD1(sql: string, params: unknown[] = []) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/d1/database/${D1_DATABASE_ID}/query`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sql,
        params,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`D1 query failed: ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(`D1 query error: ${data.errors[0].message}`);
  }

  return data.result[0].results;
}

// ─── Get Latest Post ───────────────────────────────────────────────────────────

function getLatestPostSlug(): string | null {
  if (!fs.existsSync(POSTS_DIR)) {
    console.error("Posts directory not found");
    return null;
  }

  const files = fs.readdirSync(POSTS_DIR).filter((f: string) => f.endsWith(".md"));
  if (files.length === 0) {
    console.error("No posts found");
    return null;
  }

  // Sort by filename (assuming slug-based naming)
  const latest = files.sort().reverse()[0];
  return latest.replace(".md", "");
}

// ─── Check if Already Sent ──────────────────────────────────────────────────────

async function alreadySent(slug: string): Promise<boolean> {
  const results = await queryD1(
    "SELECT id FROM newsletter_sent WHERE post_slug = ?",
    [slug],
  );
  return results.length > 0;
}

// ─── Get Post Content ─────────────────────────────────────────────────────────

function getPostContent(slug: string): { title: string; excerpt: string } | null {
  const filePath = path.join(POSTS_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) {
    console.error(`Post file not found: ${filePath}`);
    return null;
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    console.error("No frontmatter found");
    return null;
  }

  const frontmatter = frontmatterMatch[1];
  const titleMatch = frontmatter.match(/title:\s*["'](.+?)["']/);
  const title = titleMatch ? titleMatch[1] : "New Post";

  const body = content.slice(frontmatterMatch[0].length);
  const excerpt = body.slice(0, 200).replace(/\n/g, " ") + "...";

  return { title, excerpt };
}

// ─── Generate Newsletter HTML ───────────────────────────────────────────────────

function generateNewsletterHTML(
  title: string,
  excerpt: string,
  slug: string,
): string {
  const postUrl = `https://blog.hmziq.rs/posts/${slug}`;
  const unsubscribeUrl = "https://blog.hmziq.rs/newsletter/unsubscribe";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>New Post: ${title}</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
    <h2 style="color: #333; margin-top: 0;">New Post Published</h2>
    <h3 style="color: #666; margin-bottom: 10px;">${title}</h3>
    <p style="color: #555; line-height: 1.6;">${excerpt}</p>
    <a href="${postUrl}" style="display: inline-block; background: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Read Full Post</a>
  </div>
  <p style="color: #999; font-size: 12px; margin-top: 30px;">
    You're receiving this because you subscribed to Hmziq blog newsletter.
    <a href="${unsubscribeUrl}" style="color: #999;">Unsubscribe</a>
  </p>
</body>
</html>
  `.trim();
}

// ─── Send Email via Cloudflare Email Sending ────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string) {
  // TODO: Implement Cloudflare Email Sending API call
  console.log(`Sending email to ${to}: ${subject}`);
  // This will use Cloudflare Email Sending API
  // For now, just log
}

// ─── Main Function ─────────────────────────────────────────────────────────────

async function main() {
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN || !D1_DATABASE_ID) {
    console.error("Missing Cloudflare credentials");
    process.exit(1);
  }

  const slug = getLatestPostSlug();
  if (!slug) {
    console.error("Could not determine latest post");
    process.exit(1);
  }

  console.log(`Latest post slug: ${slug}`);

  const sent = await alreadySent(slug);
  if (sent) {
    console.log("Newsletter already sent for this post");
    process.exit(0);
  }

  const postContent = getPostContent(slug);
  if (!postContent) {
    console.error("Could not get post content");
    process.exit(1);
  }

  console.log(`Post title: ${postContent.title}`);

  const html = generateNewsletterHTML(postContent.title, postContent.excerpt, slug);

  // Get all subscribers
  const subscribers = await queryD1("SELECT email FROM subscribers");
  console.log(`Sending to ${subscribers.length} subscribers`);

  for (const subscriber of subscribers) {
    const email = (subscriber as { email: string }).email;
    await sendEmail(
      email,
      `New Post: ${postContent.title}`,
      html,
    );
  }

  // Record as sent
  await queryD1("INSERT INTO newsletter_sent (post_slug) VALUES (?)", [slug]);

  console.log("Newsletter sent successfully");
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
