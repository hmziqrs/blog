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

  it("records rate-limit entry for each attempt", async () => {
    await checkSubscribeRateLimit(env.DB, "10.3.3.1", "record@example.com");

    const rows = await env.DB.prepare("SELECT COUNT(*) as c FROM rate_limits WHERE ip = ?")
      .bind("10.3.3.1")
      .first<{ c: number }>();
    expect(rows?.c).toBe(1);
  });

  it("records both IP and email in rate-limit entry", async () => {
    await checkSubscribeRateLimit(env.DB, "10.4.4.1", "both@example.com");

    const row = await env.DB.prepare(
      "SELECT ip, email FROM rate_limits WHERE ip = ? AND email = ?",
    )
      .bind("10.4.4.1", "both@example.com")
      .first<{ ip: string; email: string }>();
    expect(row).not.toBeNull();
    expect(row?.ip).toBe("10.4.4.1");
    expect(row?.email).toBe("both@example.com");
  });

  it("cleans up entries older than 1 hour", async () => {
    // Insert a stale entry
    const staleTime = Date.now() - 3601 * 1000;
    await env.DB.prepare("INSERT INTO rate_limits (ip, email, timestamp) VALUES (?, ?, ?)")
      .bind("old-ip", "old@example.com", staleTime)
      .run();

    // This should trigger cleanup
    await checkSubscribeRateLimit(env.DB, "new-ip", "new@example.com");

    const oldRow = await env.DB.prepare("SELECT id FROM rate_limits WHERE ip = ?")
      .bind("old-ip")
      .first();
    expect(oldRow).toBeNull();
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

  it("does not track email for unsubscribe rate limit", async () => {
    await checkUnsubscribeRateLimit(env.DB, "20.1.1.4");

    const row = await env.DB.prepare("SELECT email FROM rate_limits WHERE ip = ?")
      .bind("20.1.1.4")
      .first<{ email: string | null }>();
    expect(row?.email).toBeNull();
  });

  it("cleans up entries older than 1 hour", async () => {
    const staleTime = Date.now() - 3601 * 1000;
    await env.DB.prepare("INSERT INTO rate_limits (ip, timestamp) VALUES (?, ?)")
      .bind("old-unsub-ip", staleTime)
      .run();

    await checkUnsubscribeRateLimit(env.DB, "new-unsub-ip");

    const oldRow = await env.DB.prepare("SELECT id FROM rate_limits WHERE ip = ?")
      .bind("old-unsub-ip")
      .first();
    expect(oldRow).toBeNull();
  });
});
