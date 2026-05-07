import { env } from "cloudflare:test";
import { describe, expect, it, beforeEach } from "vitest";
import { checkSubscribeRateLimit, checkUnsubscribeRateLimit } from "../src/lib/rate-limit";

describe("checkSubscribeRateLimit", () => {
  beforeEach(async () => {
    await env.RATE_LIMIT_KV.delete("rl:ip:10.1.1.1");
    await env.RATE_LIMIT_KV.delete("rl:ip:10.1.1.2");
    await env.RATE_LIMIT_KV.delete("rl:ip:10.1.1.3");
    await env.RATE_LIMIT_KV.delete("rl:ip:10.2.2.1");
    await env.RATE_LIMIT_KV.delete("rl:ip:10.2.2.2");
    await env.RATE_LIMIT_KV.delete("rl:ip:10.2.2.3");
    await env.RATE_LIMIT_KV.delete("rl:ip:10.2.2.4");
    await env.RATE_LIMIT_KV.delete("rl:ip:10.2.2.5");
    await env.RATE_LIMIT_KV.delete("rl:ip:10.2.2.6");
    await env.RATE_LIMIT_KV.delete("rl:ip:10.3.3.1");
    await env.RATE_LIMIT_KV.delete("rl:ip:10.3.3.2");
    await env.RATE_LIMIT_KV.delete("rl:ip:10.3.3.3");
    await env.RATE_LIMIT_KV.delete("rl:ip:10.4.4.1");
    await env.RATE_LIMIT_KV.delete("rl:email:user-a@example.com");
    await env.RATE_LIMIT_KV.delete("rl:email:user-b@example.com");
    await env.RATE_LIMIT_KV.delete("rl:email:user-x@example.com");
    await env.RATE_LIMIT_KV.delete("rl:email:user-y@example.com");
    await env.RATE_LIMIT_KV.delete("rl:email:user-z@example.com");
    await env.RATE_LIMIT_KV.delete("rl:email:unique@example.com");
    await env.RATE_LIMIT_KV.delete("rl:email:same-email@example.com");
    await env.RATE_LIMIT_KV.delete("rl:email:blocked-email@example.com");
    await env.RATE_LIMIT_KV.delete("rl:email:a@example.com");
    await env.RATE_LIMIT_KV.delete("rl:email:b@example.com");
    await env.RATE_LIMIT_KV.delete("rl:email:c@example.com");
    await env.RATE_LIMIT_KV.delete("rl:email:ttl@example.com");
    await env.RATE_LIMIT_KV.delete("rl:email:user1@example.com");
  });

  it("allows first request from an IP", async () => {
    const result = await checkSubscribeRateLimit(
      env.RATE_LIMIT_KV,
      "10.1.1.1",
      "user1@example.com",
    );
    expect(result.allowed).toBe(true);
  });

  it("allows second request from same IP (different email)", async () => {
    await checkSubscribeRateLimit(env.RATE_LIMIT_KV, "10.1.1.2", "user-a@example.com");
    const result = await checkSubscribeRateLimit(
      env.RATE_LIMIT_KV,
      "10.1.1.2",
      "user-b@example.com",
    );
    expect(result.allowed).toBe(true);
  });

  it("blocks third request from same IP", async () => {
    await checkSubscribeRateLimit(env.RATE_LIMIT_KV, "10.1.1.3", "user-x@example.com");
    await checkSubscribeRateLimit(env.RATE_LIMIT_KV, "10.1.1.3", "user-y@example.com");
    const result = await checkSubscribeRateLimit(
      env.RATE_LIMIT_KV,
      "10.1.1.3",
      "user-z@example.com",
    );
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSec).toBeGreaterThan(0);
  });

  it("allows first request for an email", async () => {
    const result = await checkSubscribeRateLimit(
      env.RATE_LIMIT_KV,
      "10.2.2.1",
      "unique@example.com",
    );
    expect(result.allowed).toBe(true);
  });

  it("allows second request for same email from different IP", async () => {
    await checkSubscribeRateLimit(env.RATE_LIMIT_KV, "10.2.2.2", "same-email@example.com");
    const result = await checkSubscribeRateLimit(
      env.RATE_LIMIT_KV,
      "10.2.2.3",
      "same-email@example.com",
    );
    expect(result.allowed).toBe(true);
  });

  it("blocks third request for same email", async () => {
    await checkSubscribeRateLimit(env.RATE_LIMIT_KV, "10.2.2.4", "blocked-email@example.com");
    await checkSubscribeRateLimit(env.RATE_LIMIT_KV, "10.2.2.5", "blocked-email@example.com");
    const result = await checkSubscribeRateLimit(
      env.RATE_LIMIT_KV,
      "10.2.2.6",
      "blocked-email@example.com",
    );
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSec).toBeGreaterThan(0);
  });

  it("does not interfere across different IPs and emails", async () => {
    await checkSubscribeRateLimit(env.RATE_LIMIT_KV, "10.3.3.1", "a@example.com");
    await checkSubscribeRateLimit(env.RATE_LIMIT_KV, "10.3.3.2", "b@example.com");
    const result = await checkSubscribeRateLimit(env.RATE_LIMIT_KV, "10.3.3.3", "c@example.com");
    expect(result.allowed).toBe(true);
  });

  it("stores entries in KV with correct key prefix", async () => {
    await checkSubscribeRateLimit(env.RATE_LIMIT_KV, "10.4.4.1", "ttl@example.com");
    const raw = await env.RATE_LIMIT_KV.get("rl:ip:10.4.4.1");
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed).toHaveLength(1);
  });
});

describe("checkUnsubscribeRateLimit", () => {
  beforeEach(async () => {
    await env.RATE_LIMIT_KV.delete("rl:ip:20.1.1.1");
    await env.RATE_LIMIT_KV.delete("rl:ip:20.1.1.2");
    await env.RATE_LIMIT_KV.delete("rl:ip:20.1.1.3");
  });

  it("allows first request from an IP", async () => {
    const result = await checkUnsubscribeRateLimit(env.RATE_LIMIT_KV, "20.1.1.1");
    expect(result.allowed).toBe(true);
  });

  it("allows up to 3 requests from same IP", async () => {
    await checkUnsubscribeRateLimit(env.RATE_LIMIT_KV, "20.1.1.2");
    await checkUnsubscribeRateLimit(env.RATE_LIMIT_KV, "20.1.1.2");
    const result = await checkUnsubscribeRateLimit(env.RATE_LIMIT_KV, "20.1.1.2");
    expect(result.allowed).toBe(true);
  });

  it("blocks fourth request from same IP", async () => {
    await checkUnsubscribeRateLimit(env.RATE_LIMIT_KV, "20.1.1.3");
    await checkUnsubscribeRateLimit(env.RATE_LIMIT_KV, "20.1.1.3");
    await checkUnsubscribeRateLimit(env.RATE_LIMIT_KV, "20.1.1.3");
    const result = await checkUnsubscribeRateLimit(env.RATE_LIMIT_KV, "20.1.1.3");
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSec).toBeGreaterThan(0);
  });
});
