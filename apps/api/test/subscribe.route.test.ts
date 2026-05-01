import { env, createExecutionContext } from "cloudflare:test";
import { describe, expect, it, afterEach, beforeEach } from "vitest";
import app from "../src/app";

const ctx = createExecutionContext();

function req(path: string, init?: RequestInit) {
  return new Request(`http://localhost${path}`, init);
}

const FAKE_TURNSTILE_SECRET = "0x4AAAAAAAfakeSecretKeyForTesting";

let originalFetch: typeof fetch;
let originalEnvironment: string;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes("challenges.cloudflare.com/turnstile")) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { "content-type": "application/json" },
      });
    }
    return originalFetch(input, init);
  }) as typeof fetch;

  // Set a non-test Turnstile secret so M5 passes
  env.TURNSTILE_SECRET_KEY = FAKE_TURNSTILE_SECRET;
  // Set non-production so L5 (missing CF-Connecting-IP) doesn't block tests
  originalEnvironment = env.ENVIRONMENT;
  env.ENVIRONMENT = "test";
});

afterEach(async () => {
  globalThis.fetch = originalFetch;
  env.ENVIRONMENT = originalEnvironment;
  await env.DB.prepare("DELETE FROM subscribers WHERE email LIKE ?")
    .bind("test-%@example.com")
    .run();
  // Clear KV rate-limit keys
  const kvKeys = [
    "rl:ip:1.2.3.4", "rl:ip:10.0.0.1", "rl:ip:10.0.0.2", "rl:ip:10.0.0.3",
    "rl:ip:unknown",
  ];
  await Promise.all(kvKeys.map((k) => env.RATE_LIMIT_KV.delete(k)));
  // Clear email keys used by rate-limit and subscribe tests
  const emailKeys = [
    "rl:email:test-rl-1@example.com", "rl:email:test-rl-2@example.com",
    "rl:email:test-rl-3@example.com", "rl:email:test-rate@example.com",
    "rl:email:testuser@gmail.com", "rl:email:test-dup@example.com",
    "rl:email:test-resub@example.com", "rl:email:test-concurrent@example.com",
  ];
  await Promise.all(emailKeys.map((k) => env.RATE_LIMIT_KV.delete(k)));
});

describe("POST /api/newsletter/subscribe", () => {
  // ─── Content-Type validation ─────────────────────────────────────────

  it("rejects wrong Content-Type", async () => {
    const res = await app.fetch(
      req("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: "hello",
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(415);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("application/json");
  });

  it("rejects missing Content-Type", async () => {
    const res = await app.fetch(
      req("/api/newsletter/subscribe", {
        method: "POST",
        body: JSON.stringify({ email: "a@b.com", token: "xyz" }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(415);
  });

  // L4: strict Content-Type parsing via split(";")[0].trim()
  it("rejects spoofed Content-Type like application/json-pretend", async () => {
    const res = await app.fetch(
      req("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json-pretend" },
        body: JSON.stringify({ email: "user@example.com", token: "abc123" }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(415);
  });

  // ─── M5: Turnstile test key guard ────────────────────────────────────

  it("returns 503 when Turnstile secret is empty", async () => {
    env.TURNSTILE_SECRET_KEY = "";
    const res = await app.fetch(
      req("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "user@example.com", token: "abc123" }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Service misconfigured");
  });

  it("returns 503 when Turnstile secret is a test key (1x)", async () => {
    env.TURNSTILE_SECRET_KEY = "1x0000000000000000000000000000000AA";
    const res = await app.fetch(
      req("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "user@example.com", token: "abc123" }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Service misconfigured");
  });

  it("returns 503 when Turnstile secret is a test key (2x)", async () => {
    env.TURNSTILE_SECRET_KEY = "2x0000000000000000000000000000000AA";
    const res = await app.fetch(
      req("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "user@example.com", token: "abc123" }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(503);
  });

  it("returns 503 when Turnstile secret is a test key (3x)", async () => {
    env.TURNSTILE_SECRET_KEY = "3x0000000000000000000000000000000AA";
    const res = await app.fetch(
      req("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "user@example.com", token: "abc123" }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(503);
  });

  // ─── Field validation ───────────────────────────────────────────────

  it("rejects invalid email", async () => {
    const res = await app.fetch(
      req("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "notanemail", token: "abc123" }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(400);
  });

  it("rejects missing email field", async () => {
    const res = await app.fetch(
      req("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "abc123" }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(400);
  });

  it("rejects empty CAPTCHA token", async () => {
    const res = await app.fetch(
      req("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "user@example.com", token: "" }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(400);
  });

  it("rejects missing CAPTCHA token", async () => {
    const res = await app.fetch(
      req("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "user@example.com" }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(400);
  });

  // ─── L3: Honeypot returns fake 201 instead of 400 ──────────────────

  it("returns fake success for non-empty honeypot (bot trap)", async () => {
    const res = await app.fetch(
      req("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "user@example.com",
          token: "abc123",
          honeypot: "bot-value",
        }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { message: string };
    expect(body.message).toBe("Subscribed");

    // Verify no DB entry was created
    const count = await env.DB.prepare("SELECT COUNT(*) as c FROM subscribers WHERE email = ?")
      .bind("user@example.com")
      .first<{ c: number }>();
    expect(count?.c).toBe(0);
  });

  // ─── Happy path ──────────────────────────────────────────────────────

  it("subscribes successfully with valid data", async () => {
    const res = await app.fetch(
      req("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "test-happy@example.com", token: "abc123" }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { message: string };
    expect(body.message).toBe("Subscribed");
  });

  it("persists subscriber in DB after successful subscription", async () => {
    await app.fetch(
      req("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "test-persist@example.com", token: "abc123" }),
      }),
      env,
      ctx,
    );

    const row = await env.DB.prepare("SELECT email, status FROM subscribers WHERE email = ?")
      .bind("test-persist@example.com")
      .first<{ email: string; status: string }>();

    expect(row).not.toBeNull();
    expect(row?.email).toBe("test-persist@example.com");
    expect(row?.status).toBe("active");
  });

  it("normalizes gmail addresses before storing", async () => {
    await app.fetch(
      req("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "Test.User+Newsletter@gmail.com",
          token: "abc123",
        }),
      }),
      env,
      ctx,
    );

    const row = await env.DB.prepare("SELECT email FROM subscribers WHERE email = ?")
      .bind("testuser@gmail.com")
      .first<{ email: string }>();

    expect(row).not.toBeNull();
    expect(row?.email).toBe("testuser@gmail.com");
  });

  // ─── M1: Already subscribed returns 201 (no enumeration) ─────────────

  it("returns 201 for already subscribed email (no enumeration)", async () => {
    await app.fetch(
      req("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "test-dup@example.com", token: "abc123" }),
      }),
      env,
      ctx,
    );

    const res = await app.fetch(
      req("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "test-dup@example.com", token: "abc123" }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { message: string };
    expect(body.message).toBe("Subscribed");

    // No duplicate row
    const count = await env.DB.prepare("SELECT COUNT(*) as c FROM subscribers WHERE email = ?")
      .bind("test-dup@example.com")
      .first<{ c: number }>();
    expect(count?.c).toBe(1);
  });

  // ─── Re-subscribe after unsubscribe ──────────────────────────────────

  it("re-activates unsubscribed subscriber", async () => {
    // Subscribe
    await app.fetch(
      req("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "test-resub@example.com", token: "abc123" }),
      }),
      env,
      ctx,
    );

    // Simulate unsubscribe (soft delete)
    await env.DB.prepare(
      "UPDATE subscribers SET status = 'unsubscribed', unsubscribed_at = datetime('now') WHERE email = ?",
    )
      .bind("test-resub@example.com")
      .run();

    // Re-subscribe
    const res = await app.fetch(
      req("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "test-resub@example.com", token: "abc123" }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { message: string };
    expect(body.message).toBe("Subscribed");

    const row = await env.DB.prepare(
      "SELECT status, unsubscribed_at FROM subscribers WHERE email = ?",
    )
      .bind("test-resub@example.com")
      .first<{ status: string; unsubscribed_at: string | null }>();
    expect(row?.status).toBe("active");
    expect(row?.unsubscribed_at).toBeNull();
  });

  // ─── H2c: Concurrent subscribe same email ────────────────────────────

  it("handles concurrent subscribe requests for same email gracefully", async () => {
    const reqBody = JSON.stringify({ email: "test-concurrent@example.com", token: "abc123" });

    const [res1, res2] = await Promise.all([
      app.fetch(
        req("/api/newsletter/subscribe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: reqBody,
        }),
        env,
        ctx,
      ),
      app.fetch(
        req("/api/newsletter/subscribe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: reqBody,
        }),
        env,
        ctx,
      ),
    ]);

    // Both should return 201 (M1: no enumeration)
    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);

    // Exactly one row in subscribers
    const count = await env.DB.prepare("SELECT COUNT(*) as c FROM subscribers WHERE email = ?")
      .bind("test-concurrent@example.com")
      .first<{ c: number }>();
    expect(count?.c).toBe(1);
  });

  // ─── Rate limiting ───────────────────────────────────────────────────

  it("rate-limits after 2 requests from same IP", async () => {
    const headers = {
      "content-type": "application/json",
      "CF-Connecting-IP": "1.2.3.4",
    };

    for (let i = 1; i <= 2; i++) {
      const res = await app.fetch(
        new Request("http://localhost/api/newsletter/subscribe", {
          method: "POST",
          headers,
          body: JSON.stringify({ email: `test-rl${i}@example.com`, token: "abc123" }),
        }),
        env,
        ctx,
      );
      expect(res.status).toBe(201);
    }

    const res = await app.fetch(
      new Request("http://localhost/api/newsletter/subscribe", {
        method: "POST",
        headers,
        body: JSON.stringify({ email: "test-rl3@example.com", token: "abc123" }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(429);
  });

  it("rate-limits after 2 requests for same email", async () => {
    // First attempt: subscribes successfully
    const res1 = await app.fetch(
      new Request("http://localhost/api/newsletter/subscribe", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "CF-Connecting-IP": "10.0.0.1",
        },
        body: JSON.stringify({ email: "test-rl-email@example.com", token: "abc123" }),
      }),
      env,
      ctx,
    );
    expect(res1.status).toBe(201);

    // Second attempt with same email: already subscribed, returns 201 (M1), rate-limit entry recorded
    const res2 = await app.fetch(
      new Request("http://localhost/api/newsletter/subscribe", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "CF-Connecting-IP": "10.0.0.2",
        },
        body: JSON.stringify({ email: "test-rl-email@example.com", token: "abc123" }),
      }),
      env,
      ctx,
    );
    expect(res2.status).toBe(201);

    // Third attempt with same email: rate-limited
    const res3 = await app.fetch(
      new Request("http://localhost/api/newsletter/subscribe", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "CF-Connecting-IP": "10.0.0.3",
        },
        body: JSON.stringify({ email: "test-rl-email@example.com", token: "abc123" }),
      }),
      env,
      ctx,
    );
    expect(res3.status).toBe(429);
  });

  // ─── L5: Missing CF-Connecting-IP in production ──────────────────────

  it("rejects missing CF-Connecting-IP in production", async () => {
    env.ENVIRONMENT = "production";
    const res = await app.fetch(
      req("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "user@example.com", token: "abc123" }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Missing required headers");
  });

  it("allows missing CF-Connecting-IP in non-production", async () => {
    // beforeEach already sets ENVIRONMENT to "test", so this should pass
    const res = await app.fetch(
      req("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "test-noip@example.com", token: "abc123" }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(201);
    const body = (await res.json()) as { message: string };
    expect(body.message).toBe("Subscribed");
  });

  // ─── L1: Error logging sanitized ────────────────────────────────────

  it("returns 500 for malformed JSON body", async () => {
    const res = await app.fetch(
      req("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{not valid json}",
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Internal server error");
  });
});
