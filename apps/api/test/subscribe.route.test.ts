import { env, createExecutionContext } from "cloudflare:test";
import { describe, expect, it, afterEach } from "vitest";
import app from "../src/app";

const ctx = createExecutionContext();

function req(path: string, init?: RequestInit) {
  return new Request(`http://localhost${path}`, init);
}

describe("POST /api/newsletter/subscribe", () => {
  afterEach(async () => {
    // Clean up: delete any test subscribers and KV rate limits
    await env.DB.prepare("DELETE FROM subscribers WHERE email LIKE ?")
      .bind("test-%@example.com")
      .run();
    const list = await env.RATE_LIMIT_KV.list();
    await Promise.all(list.keys.map((k: { name: string }) => env.RATE_LIMIT_KV.delete(k.name)));
  });

  // ─── Validation ────────────────────────────────────────────────────

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

  // ─── Honeypot ──────────────────────────────────────────────────────

  it("rejects non-empty honeypot via Zod validation (bot trap)", async () => {
    const res = await app.fetch(
      req("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "user@example.com", token: "abc123", honeypot: "bot-value" }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Bot detected");

    // Verify no DB entry was created
    const count = await env.DB.prepare("SELECT COUNT(*) as c FROM subscribers WHERE email = ?")
      .bind("user@example.com")
      .first<{ c: number }>();
    expect(count?.c).toBe(0);
  });

  // ─── Timing check ──────────────────────────────────────────────────

  it("rejects when submitTime is too fast (bot detection)", async () => {
    const res = await app.fetch(
      req("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "user@example.com",
          token: "abc123",
          submitTime: Date.now(),
        }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(400);
  });

  it("allows when submitTime is old enough", async () => {
    const res = await app.fetch(
      req("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: "test-old@example.com",
          token: "abc123",
          submitTime: Date.now() - 5000,
        }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(201);
  });

  // ─── Happy path ────────────────────────────────────────────────────

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
        body: JSON.stringify({ email: "Test.User+Newsletter@gmail.com", token: "abc123" }),
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

  // ─── Already subscribed ────────────────────────────────────────────

  it("rejects already subscribed email", async () => {
    // First subscription
    await app.fetch(
      req("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "test-dup@example.com", token: "abc123" }),
      }),
      env,
      ctx,
    );

    // Duplicate attempt
    const res = await app.fetch(
      req("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "test-dup@example.com", token: "abc123" }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(409);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Already subscribed");
  });

  // ─── Rate limiting ─────────────────────────────────────────────────

  it("rate-limits after 2 requests from same IP", async () => {
    const headers = {
      "content-type": "application/json",
      "CF-Connecting-IP": "1.2.3.4",
    };

    // Two allowed
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

    // Third blocked
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

    // Second attempt with same email: already subscribed (409) but rate-limit entry recorded
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
    expect(res2.status).toBe(409);

    // Third attempt with same email: rate-limited (429)
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
});
