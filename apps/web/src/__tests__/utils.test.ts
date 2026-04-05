import { describe, expect, test } from "bun:test";
import { readingTime } from "../utils/reading-time";
import { collectSortedValues, countSortedValues, sortByDateDesc } from "../utils/posts";

describe("readingTime", () => {
  test("returns 1 for short content", () => {
    const body = "Hello world.";
    expect(readingTime(body)).toBe(1);
  });

  test("returns 1 for exactly 200 words", () => {
    const body = Array.from({ length: 200 }, () => "word").join(" ");
    expect(readingTime(body)).toBe(1);
  });

  test("returns 2 for 201 words", () => {
    const body = Array.from({ length: 201 }, () => "word").join(" ");
    expect(readingTime(body)).toBe(2);
  });

  test("returns 0 for empty string", () => {
    expect(readingTime("")).toBe(0);
  });

  test("returns 0 for whitespace-only input", () => {
    expect(readingTime("   ")).toBe(0);
  });

  test("counts words correctly across newlines", () => {
    const body = "first\nsecond\nthird";
    expect(readingTime(body)).toBe(1);
  });

  test("returns correct minutes for a long post", () => {
    const body = Array.from({ length: 600 }, () => "word").join(" ");
    expect(readingTime(body)).toBe(3);
  });
});

describe("post utils", () => {
  test("sortByDateDesc orders newest items first", () => {
    const posts = [
      { id: "older", data: { date: new Date("2026-01-01") } },
      { id: "newer", data: { date: new Date("2026-02-01") } },
      { id: "middle", data: { date: new Date("2026-01-15") } },
    ];

    expect(sortByDateDesc(posts).map((post) => post.id)).toEqual(["newer", "middle", "older"]);
  });

  test("collectSortedValues de-duplicates and sorts values", () => {
    expect(collectSortedValues(["react", "astro", "react", "bun"])).toEqual([
      "astro",
      "bun",
      "react",
    ]);
  });

  test("countSortedValues counts and sorts values", () => {
    expect(countSortedValues(["astro", "bun", "astro"])).toEqual([
      ["astro", 2],
      ["bun", 1],
    ]);
  });
});
