import { env } from "cloudflare:test";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { checkSubscribeRateLimit, checkUnsubscribeRateLimit } from "../src/lib/rate-limit";

describe("checkSubscribeRateLimit", () => {
  beforeEach(async () => {
    await env.DB.prepare("DELETE FROM rate_limits").run();
  });

  afterEach(async () => {
    await env.DB.prepare("DELETE FROM rate_limits").run();
  });

  it("allows first request from an IP", async () => {
    const allowed = await checkSubscribeRateLimit(env.DB, "10.1.1.1", "user1@example.com");
    expect(allowed).toBe(true);
  });

  it("allows second request from same IP (different email)", async () => {
    await checkSubscribeRateLimit(env.DB, "10.1.1.2", "user-a@example.com");
    const allowed = await checkSubscribeRateLimit(env.DB, "10.1.1.2", "user-b@example.com");
    expect(allowed).toBe(true);
  });

  it("blocks third request from same IP", async () => {
    await checkSubscribeRateLimit(env.DB, "10.1.1.3", "user-x@example.com");
    await checkSubscribeRateLimit(env.DB, "10.1.1.3", "user-y@example.com");
    const allowed = await checkSubscribeRateLimit(env.DB, "10.1.1.3", "user-z@example.com");
    expect(allowed).toBe(false);
  });

  it("allows first request for an email", async () => {
    const allowed = await checkSubscribeRateLimit(env.DB, "10.2.2.1", "unique@example.com");
    expect(allowed).toBe(true);
  });

  it("allows second request for same email from different IP", async () => {
    await checkSubscribeRateLimit(env.DB, "10.2.2.2", "same-email@example.com");
    const allowed = await checkSubscribeRateLimit(env.DB, "10.2.2.3", "same-email@example.com");
    expect(allowed).toBe(true);
  });

  it("blocks third request for same email", async () => {
    await checkSubscribeRateLimit(env.DB, "10.2.2.4", "blocked-email@example.com");
    await checkSubscribeRateLimit(env.DB, "10.2.2.5", "blocked-email@example.com");
    const allowed = await checkSubscribeRateLimit(env.DB, "10.2.2.6", "blocked-email@example.com");
    expect(allowed).toBe(false);
  });

  it("does not interfere across different IPs and emails", async () => {
    await checkSubscribeRateLimit(env.DB, "10.3.3.1", "a@example.com");
    await checkSubscribeRateLimit(env.DB, "10.3.3.2", "b@example.com");
    const allowed = await checkSubscribeRateLimit(env.DB, "10.3.3.3", "c@example.com");
    expect(allowed).toBe(true);
  });

  it("records entries in D1 rate_limits table", async () => {
    await checkSubscribeRateLimit(env.DB, "10.4.4.1", "ttl@example.com");
    const count = await env.DB.prepare("SELECT COUNT(*) as c FROM rate_limits WHERE ip = ?")
      .bind("10.4.4.1")
      .first<{ c: number }>();
    expect(count?.c).toBe(1);
  });
});

describe("checkUnsubscribeRateLimit", () => {
  beforeEach(async () => {
    await env.DB.prepare("DELETE FROM rate_limits").run();
  });

  afterEach(async () => {
    await env.DB.prepare("DELETE FROM rate_limits").run();
  });

  it("allows first request from an IP", async () => {
    const allowed = await checkUnsubscribeRateLimit(env.DB, "20.1.1.1");
    expect(allowed).toBe(true);
  });

  it("allows up to 3 requests from same IP", async () => {
    await checkUnsubscribeRateLimit(env.DB, "20.1.1.2");
    await checkUnsubscribeRateLimit(env.DB, "20.1.1.2");
    const allowed = await checkUnsubscribeRateLimit(env.DB, "20.1.1.2");
    expect(allowed).toBe(true);
  });

  it("blocks fourth request from same IP", async () => {
    await checkUnsubscribeRateLimit(env.DB, "20.1.1.3");
    await checkUnsubscribeRateLimit(env.DB, "20.1.1.3");
    await checkUnsubscribeRateLimit(env.DB, "20.1.1.3");
    const allowed = await checkUnsubscribeRateLimit(env.DB, "20.1.1.3");
    expect(allowed).toBe(false);
  });
});
