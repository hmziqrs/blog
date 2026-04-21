import { describe, expect, test } from "bun:test";
import { z } from "zod";
import { normalizeEmail } from "../lib/email";

// ─── normalizeEmail ────────────────────────────────────────────────────────────

describe("normalizeEmail", () => {
  test("lowercases the address", () => {
    expect(normalizeEmail("User@Example.COM")).toBe("user@example.com");
  });

  test("strips gmail plus-addressing", () => {
    expect(normalizeEmail("user+tag@gmail.com")).toBe("user@gmail.com");
  });

  test("strips gmail dots", () => {
    expect(normalizeEmail("u.s.e.r@gmail.com")).toBe("user@gmail.com");
  });

  test("strips gmail dots and plus together", () => {
    expect(normalizeEmail("u.s.e.r+tag@gmail.com")).toBe("user@gmail.com");
  });

  test("normalizes googlemail.com to gmail.com", () => {
    expect(normalizeEmail("user@googlemail.com")).toBe("user@gmail.com");
  });

  test("strips outlook plus-addressing", () => {
    expect(normalizeEmail("user+tag@outlook.com")).toBe("user@outlook.com");
  });

  test("strips hotmail plus-addressing", () => {
    expect(normalizeEmail("user+tag@hotmail.com")).toBe("user@hotmail.com");
  });

  test("strips generic plus-addressing for unknown domains", () => {
    expect(normalizeEmail("user+tag@example.com")).toBe("user@example.com");
  });

  test("does not strip dots for non-gmail domains", () => {
    expect(normalizeEmail("u.s.e.r@example.com")).toBe("u.s.e.r@example.com");
  });

  test("handles no-plus address unchanged except case", () => {
    expect(normalizeEmail("Alice@Example.COM")).toBe("alice@example.com");
  });

  test("trims whitespace", () => {
    expect(normalizeEmail("  user@example.com  ")).toBe("user@example.com");
  });
});

// ─── Subscribe schema validation ──────────────────────────────────────────────

const subscribeSchema = z.object({
  email: z.email("Invalid email address"),
  token: z.string().min(1, "CAPTCHA token required"),
  honeypot: z.string().max(0, "Bot detected").optional(),
  submitTime: z.number().optional(),
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

  test("rejects non-empty honeypot", () => {
    expect(() =>
      subscribeSchema.parse({ email: "user@example.com", token: "abc", honeypot: "filled" }),
    ).toThrow();
  });

  test("accepts empty honeypot", () => {
    expect(() =>
      subscribeSchema.parse({ email: "user@example.com", token: "abc", honeypot: "" }),
    ).not.toThrow();
  });

  test("accepts optional submitTime", () => {
    expect(() =>
      subscribeSchema.parse({ email: "user@example.com", token: "abc", submitTime: 1234567890 }),
    ).not.toThrow();
  });
});

// ─── Unsubscribe schema validation ────────────────────────────────────────────

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
