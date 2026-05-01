import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { normalizeCover } from "../utils/cover-image";

const postSchema = z.object({
  title: z.string(),
  description: z.string(),
  date: z.coerce.date(),
  updated: z.coerce.date().optional(),
  category: z.string().trim().min(1),
  tags: z.array(z.string()),
  draft: z.boolean().default(false),
  cover: z.unknown().optional(),
  cover_alt: z.string().trim().min(1).optional(),
});

describe("Post Schema", () => {
  test("accepts valid frontmatter", () => {
    const valid = {
      title: "Building a CLI with Bun",
      description: "Deep dive",
      date: "2026-01-01",
      category: "tutorials",
      tags: ["bun", "cli"],
    };
    expect(() => postSchema.parse(valid)).not.toThrow();
  });

  test("rejects missing title", () => {
    expect(() =>
      postSchema.parse({ description: "x", date: "2026-01-01", category: "news", tags: [] }),
    ).toThrow();
  });

  test("accepts arbitrary category labels", () => {
    expect(() =>
      postSchema.parse({
        title: "x",
        description: "x",
        date: "2026-01-01",
        category: "systems design",
        tags: [],
      }),
    ).not.toThrow();
  });

  test("rejects empty category", () => {
    expect(() =>
      postSchema.parse({
        title: "x",
        description: "x",
        date: "2026-01-01",
        category: "   ",
        tags: [],
      }),
    ).toThrow();
  });

  test("coerces date string to Date", () => {
    const result = postSchema.parse({
      title: "x",
      description: "x",
      date: "2026-01-01",
      category: "news",
      tags: [],
    });
    expect(result.date).toBeInstanceOf(Date);
  });

  test("defaults draft to false", () => {
    const result = postSchema.parse({
      title: "x",
      description: "x",
      date: "2026-01-01",
      category: "news",
      tags: [],
    });
    expect(result.draft).toBe(false);
  });

  test("accepts optional updated date", () => {
    const result = postSchema.parse({
      title: "x",
      description: "x",
      date: "2026-01-01",
      updated: "2026-02-01",
      category: "news",
      tags: [],
    });
    expect(result.updated).toBeInstanceOf(Date);
  });
});

describe("normalizeCover", () => {
  test("returns undefined for undefined input", () => {
    expect(normalizeCover(undefined)).toBeUndefined();
  });

  test("normalizes ImageMetadata-like input", () => {
    const result = normalizeCover({ src: "/img.jpg", width: 100, height: 200 } as any);
    expect(result).toEqual({ src: "/img.jpg", width: 100, height: 200 });
  });

  test("normalizes remote URL with manifest dimensions", () => {
    const manifest = { "https://r2.dev/img.jpg": { width: 800, height: 600 } };
    const result = normalizeCover("https://r2.dev/img.jpg", manifest);
    expect(result).toEqual({ src: "https://r2.dev/img.jpg", width: 800, height: 600 });
  });

  test("falls back to default dimensions for unknown URL", () => {
    const result = normalizeCover("https://r2.dev/unknown.jpg", {});
    expect(result).toEqual({ src: "https://r2.dev/unknown.jpg", width: 1280, height: 720 });
  });

  test("falls back to default dimensions when manifest is null", () => {
    const result = normalizeCover("https://r2.dev/img.jpg", null);
    expect(result).toEqual({ src: "https://r2.dev/img.jpg", width: 1280, height: 720 });
  });
});
