import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, "..");
export const POSTS_DIR = path.join(REPO_ROOT, "content", "posts");
export const SITE_URL = "https://hmziq.rs";

export interface PostMeta {
  slug: string;
  title: string;
  excerpt: string;
  pubDate: Date;
}

export function parsePost(filename: string, postsDir = POSTS_DIR): PostMeta | null {
  const slug = filename.replace(/\.md$/, "");
  const filePath = path.join(postsDir, filename);
  const content = fs.readFileSync(filePath, "utf-8");

  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return null;

  const fm = fmMatch[1];
  const titleMatch = fm.match(/title:\s*["'](.+?)["']/);
  const dateMatch = fm.match(/pubDate:\s*["']?(.+?)["']?(?:\n|$)/);

  const title = titleMatch?.[1] ?? "New Post";
  const pubDate = dateMatch ? new Date(dateMatch[1].trim()) : new Date(0);
  const body = content.slice(fmMatch[0].length).trim();
  const excerpt = body.slice(0, 200).replace(/\n/g, " ") + "…";

  return { slug, title, excerpt, pubDate };
}

export function getLatestPost(postsDir = POSTS_DIR): PostMeta | null {
  if (!fs.existsSync(postsDir)) return null;

  const files = fs.readdirSync(postsDir).filter((f) => f.endsWith(".md"));
  if (files.length === 0) return null;

  const posts = files.map((f) => parsePost(f, postsDir)).filter((p): p is PostMeta => p !== null);
  return posts.toSorted((a, b) => b.pubDate.getTime() - a.pubDate.getTime())[0] ?? null;
}

export function generateHTML(post: PostMeta, unsubscribeToken: string, siteUrl = SITE_URL): string {
  const postUrl = `${siteUrl}/posts/${post.slug}`;
  const unsubscribeUrl = `${siteUrl}/newsletter/unsubscribe?token=${unsubscribeToken}`;

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
