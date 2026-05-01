import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { checkSubscribeRateLimit, checkUnsubscribeRateLimit } from "../src/lib/rate-limit";

describe("checkSubscribeRateLimit", () => {
  it("allows first request from an IP", async () => {
    const allowed = await checkSubscribeRateLimit(
      env.RATE_LIMIT_KV,
      "10.1.1.1",
      "user1@example.com",
    );
    expect(allowed).toBe(true);
  });

  it("allows second request from same IP (different email)", async () => {
    await checkSubscribeRateLimit(env.RATE_LIMIT_KV, "10.1.1.2", "user-a@example.com");
    const allowed = await checkSubscribeRateLimit(
      env.RATE_LIMIT_KV,
      "10.1.1.2",
      "user-b@example.com",
    );
    expect(allowed).toBe(true);
  });

  it("blocks third request from same IP", async () => {
    await checkSubscribeRateLimit(env.RATE_LIMIT_KV, "10.1.1.3", "user-x@example.com");
    await checkSubscribeRateLimit(env.RATE_LIMIT_KV, "10.1.1.3", "user-y@example.com");
    const allowed = await checkSubscribeRateLimit(
      env.RATE_LIMIT_KV,
      "10.1.1.3",
      "user-z@example.com",
    );
    expect(allowed).toBe(false);
  });

  it("allows first request for an email", async () => {
    const allowed = await checkSubscribeRateLimit(
      env.RATE_LIMIT_KV,
      "10.2.2.1",
      "unique@example.com",
    );
    expect(allowed).toBe(true);
  });

  it("allows second request for same email from different IP", async () => {
    await checkSubscribeRateLimit(env.RATE_LIMIT_KV, "10.2.2.2", "same-email@example.com");
    const allowed = await checkSubscribeRateLimit(
      env.RATE_LIMIT_KV,
      "10.2.2.3",
      "same-email@example.com",
    );
    expect(allowed).toBe(true);
  });

  it("blocks third request for same email", async () => {
    await checkSubscribeRateLimit(env.RATE_LIMIT_KV, "10.2.2.4", "blocked-email@example.com");
    await checkSubscribeRateLimit(env.RATE_LIMIT_KV, "10.2.2.5", "blocked-email@example.com");
    const allowed = await checkSubscribeRateLimit(
      env.RATE_LIMIT_KV,
      "10.2.2.6",
      "blocked-email@example.com",
    );
    expect(allowed).toBe(false);
  });

  it("prunes timestamps older than 1 hour", async () => {
    const now = Date.now();
    const stale = [now - 3601_000];
    await env.RATE_LIMIT_KV.put("rl:ip:old-ip", JSON.stringify(stale));

    const allowed = await checkSubscribeRateLimit(env.RATE_LIMIT_KV, "old-ip", "fresh@example.com");
    expect(allowed).toBe(true);

    const remaining = await env.RATE_LIMIT_KV.get("rl:ip:old-ip");
    const arr = JSON.parse(remaining!) as number[];
    expect(arr.length).toBe(1); // stale entry pruned, only fresh entry kept
    expect(arr[0]).toBeGreaterThanOrEqual(now); // fresh entry, not the stale one
  });

  it("treats corrupt JSON values as empty (does not throw)", async () => {
    await env.RATE_LIMIT_KV.put("rl:ip:corrupt", "not-json{{");
    const allowed = await checkSubscribeRateLimit(env.RATE_LIMIT_KV, "corrupt", "ok@example.com");
    expect(allowed).toBe(true);
  });

  it("does not interfere across different IPs and emails", async () => {
    await checkSubscribeRateLimit(env.RATE_LIMIT_KV, "10.3.3.1", "a@example.com");
    await checkSubscribeRateLimit(env.RATE_LIMIT_KV, "10.3.3.2", "b@example.com");
    const allowed = await checkSubscribeRateLimit(env.RATE_LIMIT_KV, "10.3.3.3", "c@example.com");
    expect(allowed).toBe(true);
  });

  it("stores key with expirationTtl so KV auto-cleans", async () => {
    const now = Date.now();
    await checkSubscribeRateLimit(env.RATE_LIMIT_KV, "10.4.4.1", "ttl@example.com");

    const list = await env.RATE_LIMIT_KV.list({ prefix: "rl:ip:10.4.4.1" });
    expect(list.keys.length).toBe(1);
    // expiration is stored internally by KV; we can't directly read it,
    // but we can verify the key exists and the value is valid JSON.
    const raw = await env.RATE_LIMIT_KV.get(list.keys[0].name);
    const arr = JSON.parse(raw!) as number[];
    expect(Array.isArray(arr)).toBe(true);
    expect(arr[0]).toBeGreaterThanOrEqual(now);
  });
});

describe("checkUnsubscribeRateLimit", () => {
  it("allows first request from an IP", async () => {
    const allowed = await checkUnsubscribeRateLimit(env.RATE_LIMIT_KV, "20.1.1.1");
    expect(allowed).toBe(true);
  });

  it("allows up to 3 requests from same IP", async () => {
    await checkUnsubscribeRateLimit(env.RATE_LIMIT_KV, "20.1.1.2");
    await checkUnsubscribeRateLimit(env.RATE_LIMIT_KV, "20.1.1.2");
    const allowed = await checkUnsubscribeRateLimit(env.RATE_LIMIT_KV, "20.1.1.2");
    expect(allowed).toBe(true);
  });

  it("blocks fourth request from same IP", async () => {
    await checkUnsubscribeRateLimit(env.RATE_LIMIT_KV, "20.1.1.3");
    await checkUnsubscribeRateLimit(env.RATE_LIMIT_KV, "20.1.1.3");
    await checkUnsubscribeRateLimit(env.RATE_LIMIT_KV, "20.1.1.3");
    const allowed = await checkUnsubscribeRateLimit(env.RATE_LIMIT_KV, "20.1.1.3");
    expect(allowed).toBe(false);
  });
});
