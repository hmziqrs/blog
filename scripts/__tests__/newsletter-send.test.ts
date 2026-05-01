import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseNewsletterIssue, listNewsletterIssues } from "../newsletter-utils.ts";

function withTempIssue(filename: string, content: string, fn: (dir: string) => void) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "blog-nl-test-"));
  fs.writeFileSync(path.join(dir, filename), content);
  try {
    fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe("parseNewsletterIssue", () => {
  test("parses title, subject, and date from frontmatter", () => {
    withTempIssue(
      "test-issue.md",
      `---\ntitle: "Test Issue"\ndate: "2026-05-02"\n---\n\nHello world.`,
      (dir) => {
        const issue = parseNewsletterIssue("test-issue", dir);
        expect(issue).not.toBeNull();
        expect(issue!.slug).toBe("test-issue");
        expect(issue!.title).toBe("Test Issue");
        expect(issue!.subject).toBe("Test Issue");
        expect(issue!.date.getUTCFullYear()).toBe(2026);
      },
    );
  });

  test("uses custom subject when provided", () => {
    withTempIssue(
      "custom-subject.md",
      `---\ntitle: "Internal Title"\nsubject: "Email Subject Line"\ndate: "2026-05-02"\n---\n\nBody.`,
      (dir) => {
        const issue = parseNewsletterIssue("custom-subject", dir);
        expect(issue!.subject).toBe("Email Subject Line");
        expect(issue!.title).toBe("Internal Title");
      },
    );
  });

  test("defaults subject to title when missing", () => {
    withTempIssue(
      "no-subject.md",
      `---\ntitle: "My Issue"\ndate: "2026-05-02"\n---\n\nBody.`,
      (dir) => {
        const issue = parseNewsletterIssue("no-subject", dir);
        expect(issue!.subject).toBe("My Issue");
      },
    );
  });

  test("returns null for missing file", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "blog-nl-test-"));
    try {
      expect(parseNewsletterIssue("nonexistent", dir)).toBeNull();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("returns null for missing frontmatter", () => {
    withTempIssue("bad.md", "No frontmatter here.", (dir) => {
      expect(parseNewsletterIssue("bad", dir)).toBeNull();
    });
  });

  test("renders markdown body to HTML", () => {
    withTempIssue(
      "md-body.md",
      `---\ntitle: "Test"\ndate: "2026-05-02"\n---\n\n**Bold** and *italic*.`,
      (dir) => {
        const issue = parseNewsletterIssue("md-body", dir);
        expect(issue!.htmlBody).toContain("<strong>Bold</strong>");
        expect(issue!.htmlBody).toContain("<em>italic</em>");
      },
    );
  });

  test("parses posts list and appends featured posts section", () => {
    withTempIssue(
      "with-posts.md",
      `---\ntitle: "Digest"\ndate: "2026-05-02"\nposts:\n  - "my-first-post"\n  - "another-post"\n---\n\nCheck these out.`,
      (dir) => {
        const issue = parseNewsletterIssue("with-posts", dir);
        expect(issue!.posts).toEqual(["my-first-post", "another-post"]);
        expect(issue!.htmlBody).toContain("Featured Posts");
        expect(issue!.htmlBody).toContain("/posts/my-first-post");
        expect(issue!.htmlBody).toContain("/posts/another-post");
      },
    );
  });

  test("defaults posts to empty array when missing", () => {
    withTempIssue(
      "no-posts.md",
      `---\ntitle: "Test"\ndate: "2026-05-02"\n---\n\nJust text.`,
      (dir) => {
        const issue = parseNewsletterIssue("no-posts", dir);
        expect(issue!.posts).toEqual([]);
        expect(issue!.htmlBody).not.toContain("Featured Posts");
      },
    );
  });
});

describe("listNewsletterIssues", () => {
  test("returns empty array for non-existent directory", () => {
    const issues = listNewsletterIssues("/nonexistent/path");
    expect(issues).toEqual([]);
  });

  test("scans directory and returns parsed issues sorted by date", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "blog-nl-test-"));
    fs.writeFileSync(path.join(dir, "later.md"), `---\ntitle: "Later"\ndate: "2026-06-01"\n---\n\nBody.`);
    fs.writeFileSync(path.join(dir, "earlier.md"), `---\ntitle: "Earlier"\ndate: "2026-05-01"\n---\n\nBody.`);
    try {
      const issues = listNewsletterIssues(dir);
      expect(issues).toHaveLength(2);
      expect(issues[0].slug).toBe("earlier");
      expect(issues[1].slug).toBe("later");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("skips files that fail to parse", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "blog-nl-test-"));
    fs.writeFileSync(path.join(dir, "good.md"), `---\ntitle: "Good"\ndate: "2026-05-01"\n---\n\nBody.`);
    fs.writeFileSync(path.join(dir, "bad.md"), "No frontmatter.");
    try {
      const issues = listNewsletterIssues(dir);
      expect(issues).toHaveLength(1);
      expect(issues[0].slug).toBe("good");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
