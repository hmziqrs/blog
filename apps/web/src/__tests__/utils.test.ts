import { describe, expect, test } from "bun:test";
import { readingTime } from "../utils/reading-time";

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

  test("returns 1 for empty string", () => {
    // single empty token after trim/split — ceil(1/200) = 1
    expect(readingTime("")).toBe(1);
  });

  test("handles whitespace-only input", () => {
    expect(readingTime("   ")).toBe(1);
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
