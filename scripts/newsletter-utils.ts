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

export async function queryD1<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID ?? "";
  const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN ?? "";
  const D1_DATABASE_ID = process.env.D1_DATABASE_ID ?? "";

  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN || !D1_DATABASE_ID) {
    throw new Error("Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, D1_DATABASE_ID");
  }

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
    const body = await response.text().catch(() => "");
    throw new Error(`D1 query failed (${response.status}): ${response.statusText} — ${body}`);
  }

  const data = await response.json<{
    success: boolean;
    errors: Array<{ message: string }>;
    result: Array<{ results: T[] }>;
  }>();
  if (!data.success) throw new Error(`D1 error: ${data.errors[0].message}`);

  return data.result[0].results;
}

export function listNewsletterIssues(dir = NEWSLETTERS_DIR): NewsletterIssue[] {
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  const issues: NewsletterIssue[] = [];

  for (const file of files) {
    const slug = file.replace(/\.md$/, "");
    const issue = parseNewsletterIssue(slug, dir);
    if (issue) issues.push(issue);
  }

  issues.sort((a, b) => a.date.getTime() - b.date.getTime());
  return issues;
}

export async function getSentSlugs(): Promise<string[]> {
  const rows = await queryD1<{ issue_slug: string }>(
    "SELECT issue_slug FROM newsletter_sent",
  );
  return rows.map((r) => r.issue_slug);
}

function escapeHTML(raw: string): string {
  return raw.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] ?? ch);
}

function escapeAttr(raw: string): string {
  return raw.replace(/[&"<>'"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] ?? ch);
}
