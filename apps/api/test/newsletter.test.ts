import { describe, expect, test } from "vitest";
import { z } from "zod";
import { normalizeEmail } from "../src/lib/email";
import { timingSafeEqual } from "../src/modules/newsletter/routes/send";

describe("normalizeEmail", () => {
  test("lowercases the address", () => {
    expect(normalizeEmail("User@Example.COM")).toBe("user@example.com");
  });

  test("strips plus-addressing", () => {
    expect(normalizeEmail("user+tag@gmail.com")).toBe("user@gmail.com");
  });

  test("preserves dots in local part", () => {
    expect(normalizeEmail("u.s.e.r@gmail.com")).toBe("u.s.e.r@gmail.com");
  });

  test("strips plus-addressing and preserves dots", () => {
    expect(normalizeEmail("u.s.e.r+tag@gmail.com")).toBe("u.s.e.r@gmail.com");
  });

  test("does not normalize googlemail.com", () => {
    expect(normalizeEmail("user@googlemail.com")).toBe("user@googlemail.com");
  });

  test("strips plus-addressing for any domain", () => {
    expect(normalizeEmail("user+tag@outlook.com")).toBe("user@outlook.com");
    expect(normalizeEmail("user+tag@hotmail.com")).toBe("user@hotmail.com");
    expect(normalizeEmail("user+tag@example.com")).toBe("user@example.com");
  });

  test("handles no-plus address unchanged except case", () => {
    expect(normalizeEmail("Alice@Example.COM")).toBe("alice@example.com");
  });

  test("trims whitespace", () => {
    expect(normalizeEmail("  user@example.com  ")).toBe("user@example.com");
  });
});

const subscribeSchema = z.object({
  email: z.email("Invalid email address"),
  token: z.string().min(1, "CAPTCHA token required"),
  honeypot: z.string().optional(),
});

describe("subscribe schema", () => {
  test("accepts valid payload", () => {
    expect(() =>
      subscribeSchema.parse({ email: "user@example.com", token: "abc123" }),
    ).not.toThrow();
  });

  test("rejects missing token", () => {
    expect(() => subscribeSchema.parse({ email: "user@example.com", token: "" })).toThrow();
  });

  test("rejects invalid email", () => {
    expect(() => subscribeSchema.parse({ email: "notanemail", token: "abc" })).toThrow();
  });

  test("accepts non-empty honeypot (handled by route, not schema)", () => {
    expect(() =>
      subscribeSchema.parse({ email: "user@example.com", token: "abc", honeypot: "filled" }),
    ).not.toThrow();
  });

  test("accepts empty honeypot", () => {
    expect(() =>
      subscribeSchema.parse({ email: "user@example.com", token: "abc", honeypot: "" }),
    ).not.toThrow();
  });
});

const unsubscribeSchema = z.object({
  token: z.string().min(1, "Unsubscribe token required"),
});

describe("unsubscribe schema", () => {
  test("accepts valid token", () => {
    expect(() => unsubscribeSchema.parse({ token: "some-uuid" })).not.toThrow();
  });

  test("rejects empty token", () => {
    expect(() => unsubscribeSchema.parse({ token: "" })).toThrow();
  });

  test("rejects missing token", () => {
    expect(() => unsubscribeSchema.parse({})).toThrow();
  });
});

// H3: timingSafeEqual helper unit tests
describe("timingSafeEqual", () => {
  test("equal strings return true", () => {
    expect(timingSafeEqual("secret123", "secret123")).toBe(true);
  });

  test("unequal same-length strings return false", () => {
    expect(timingSafeEqual("secret123", "secret124")).toBe(false);
    expect(timingSafeEqual("aaaaaaaa", "bbbbbbbb")).toBe(false);
  });

  test("unequal length strings return false", () => {
    expect(timingSafeEqual("short", "longer string")).toBe(false);
    expect(timingSafeEqual("longer string", "short")).toBe(false);
  });

  test("empty strings are equal", () => {
    expect(timingSafeEqual("", "")).toBe(true);
  });

  test("empty vs non-empty returns false", () => {
    expect(timingSafeEqual("", "x")).toBe(false);
    expect(timingSafeEqual("x", "")).toBe(false);
  });
});
