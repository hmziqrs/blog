import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { marked } from "marked";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, "..");
export const NEWSLETTERS_DIR = path.join(REPO_ROOT, "content", "newsletters");

export interface NewsletterIssue {
  slug: string;
  title: string;
  subject: string;
  date: Date;
  posts: string[];
  htmlBody: string;
}

export function parseNewsletterIssue(slug: string, dir = NEWSLETTERS_DIR): NewsletterIssue | null {
  const filePath = path.join(dir, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;

  const content = fs.readFileSync(filePath, "utf-8");
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return null;

  const fm = fmMatch[1];
  const titleMatch = fm.match(/title:\s*["'](.+?)["']/);
  const subjectMatch = fm.match(/subject:\s*["'](.+?)["']/);
  const dateMatch = fm.match(/date:\s*["']?(.+?)["']?(?:\n|$)/);
  const postsMatch = fm.match(/posts:\s*\n((?:\s+-\s+.+\n?)+)/);

  const title = titleMatch?.[1] ?? "Newsletter";
  const date = dateMatch ? new Date(dateMatch[1].trim()) : new Date();
  const posts = postsMatch
    ? [...postsMatch[1].matchAll(/-\s+"?([^"\n]+)"?/g)].map((m) => m[1].trim())
    : [];

  const body = content.slice(fmMatch[0].length).trim();
  let htmlBody = marked.parse(body) as string;

  if (posts.length > 0) {
    const links = posts.map((p) => `<li><a href="${escapeAttr(`/posts/${p}`)}">${escapeHTML(p)}</a></li>`).join("");
    htmlBody += `\n<h3>Featured Posts</h3>\n<ul>${links}</ul>`;
  }

  return {
    slug,
    title,
    subject: subjectMatch?.[1] ?? title,
    date,
    posts,
    htmlBody,
  };
}

function escapeHTML(raw: string): string {
  return raw.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] ?? ch);
}

function escapeAttr(raw: string): string {
  return raw.replace(/[&"<>'"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] ?? ch);
}
