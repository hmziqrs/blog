import { describe, expect, test } from "bun:test";
import { z } from "zod";

const postSchema = z.object({
  title: z.string(),
  description: z.string(),
  date: z.coerce.date(),
  updated: z.coerce.date().optional(),
  category: z.string().trim().min(1),
  tags: z.array(z.string()),
  draft: z.boolean().default(false),
  cover: z.unknown().optional(),
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
