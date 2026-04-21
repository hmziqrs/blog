import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { generateHTML, parsePost, getLatestPost } from "../../../../scripts/newsletter-utils.ts";

// ─── parsePost ─────────────────────────────────────────────────────────────────

function withTempPost(filename: string, content: string, fn: (dir: string) => void) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "blog-test-"));
  fs.writeFileSync(path.join(dir, filename), content);
  try {
    fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe("parsePost", () => {
  test("parses title and pubDate from frontmatter", () => {
    withTempPost(
      "hello.md",
      `---\ntitle: "Hello World"\npubDate: "2026-01-15"\n---\n\nBody content here.`,
      (dir) => {
        const post = parsePost("hello.md", dir);
        expect(post).not.toBeNull();
        expect(post!.slug).toBe("hello");
        expect(post!.title).toBe("Hello World");
        expect(post!.pubDate.getUTCFullYear()).toBe(2026);
      },
    );
  });

  test("returns null for missing frontmatter", () => {
    withTempPost("bad.md", "No frontmatter here.", (dir) => {
      expect(parsePost("bad.md", dir)).toBeNull();
    });
  });

  test("defaults title to 'New Post' when missing", () => {
    withTempPost("no-title.md", `---\npubDate: "2026-01-01"\n---\n\nBody.`, (dir) => {
      const post = parsePost("no-title.md", dir);
      expect(post!.title).toBe("New Post");
    });
  });

  test("defaults pubDate to epoch when missing", () => {
    withTempPost("no-date.md", `---\ntitle: "Something"\n---\n\nBody.`, (dir) => {
      const post = parsePost("no-date.md", dir);
      expect(post!.pubDate.getTime()).toBe(0);
    });
  });

  test("generates excerpt from body", () => {
    const body = "A".repeat(300);
    withTempPost("long.md", `---\ntitle: "Long"\npubDate: "2026-01-01"\n---\n\n${body}`, (dir) => {
      const post = parsePost("long.md", dir);
      expect(post!.excerpt.length).toBeLessThanOrEqual(205); // 200 + "…"
    });
  });
});

// ─── getLatestPost ─────────────────────────────────────────────────────────────

describe("getLatestPost", () => {
  test("returns null for empty directory", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "blog-test-"));
    try {
      expect(getLatestPost(dir)).toBeNull();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("returns null for non-existent directory", () => {
    expect(getLatestPost("/does/not/exist")).toBeNull();
  });

  test("picks post with latest pubDate, not filename order", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "blog-test-"));
    try {
      fs.writeFileSync(
        path.join(dir, "aaa.md"),
        `---\ntitle: "Older"\npubDate: "2026-01-01"\n---\n\nBody.`,
      );
      fs.writeFileSync(
        path.join(dir, "zzz.md"),
        `---\ntitle: "Newer"\npubDate: "2026-06-01"\n---\n\nBody.`,
      );
      const post = getLatestPost(dir);
      expect(post!.title).toBe("Newer");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ─── generateHTML ──────────────────────────────────────────────────────────────

describe("generateHTML", () => {
  const post = {
    slug: "my-post",
    title: "My Post",
    excerpt: "A short excerpt.",
    pubDate: new Date("2026-01-01"),
  };

  test("contains the post title", () => {
    const html = generateHTML(post, "token-abc", "https://example.com");
    expect(html).toContain("My Post");
  });

  test("contains a link to the post", () => {
    const html = generateHTML(post, "token-abc", "https://example.com");
    expect(html).toContain("https://example.com/posts/my-post");
  });

  test("contains a per-subscriber unsubscribe link", () => {
    const html = generateHTML(post, "token-abc", "https://example.com");
    expect(html).toContain("token=token-abc");
    expect(html).toContain("/newsletter/unsubscribe");
  });

  test("different tokens produce different unsubscribe links", () => {
    const html1 = generateHTML(post, "token-1", "https://example.com");
    const html2 = generateHTML(post, "token-2", "https://example.com");
    expect(html1).not.toBe(html2);
    expect(html1).toContain("token=token-1");
    expect(html2).toContain("token=token-2");
  });
});
