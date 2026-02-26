import { describe, expect, test } from "bun:test";

function extractUniqueTags(posts: { data: { tags: string[] } }[]): string[] {
  return [...new Set(posts.flatMap((p) => p.data.tags))].toSorted();
}

describe("Tag Extraction", () => {
  test("extracts unique sorted tags", () => {
    const posts = [
      { data: { tags: ["typescript", "tooling"] } },
      { data: { tags: ["typescript", "testing"] } },
    ];
    expect(extractUniqueTags(posts)).toEqual(["testing", "tooling", "typescript"]);
  });

  test("handles empty tags", () => {
    expect(extractUniqueTags([{ data: { tags: [] } }])).toEqual([]);
  });

  test("handles empty posts array", () => {
    expect(extractUniqueTags([])).toEqual([]);
  });

  test("deduplicates tags across posts", () => {
    const posts = [
      { data: { tags: ["astro", "bun"] } },
      { data: { tags: ["bun", "tailwind"] } },
      { data: { tags: ["astro", "tailwind"] } },
    ];
    expect(extractUniqueTags(posts)).toEqual(["astro", "bun", "tailwind"]);
  });
});
