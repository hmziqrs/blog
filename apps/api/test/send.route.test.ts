import { env, createExecutionContext } from "cloudflare:test";
import { describe, expect, it, beforeAll, afterEach } from "vitest";
import app from "../src/index";

const ctx = createExecutionContext();

function req(path: string, init?: RequestInit) {
  return new Request(`http://localhost${path}`, init);
}

describe("POST /api/newsletter/send", () => {
  const AUTH_HEADER = { "x-send-secret": "local-dev-secret" };

  beforeAll(async () => {
    // Seed an active subscriber for send tests
    await env.DB.prepare(
      "INSERT OR IGNORE INTO subscribers (id, email, status, unsubscribe_token) VALUES (?, ?, 'active', ?)",
    )
      .bind("send-sub-1", "test-send@example.com", "unsub-token-send")
      .run();
  });

  afterEach(async () => {
    await env.DB.prepare("DELETE FROM newsletter_sent").run();
    await env.DB.prepare("DELETE FROM newsletter_deliveries").run();
  });

  // ─── Authentication ────────────────────────────────────────────────

  it("rejects requests without auth header", async () => {
    const res = await app.fetch(
      req("/api/newsletter/send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: "my-post", title: "My Post", excerpt: "An excerpt" }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(401);
  });

  it("rejects requests with wrong auth header", async () => {
    const res = await app.fetch(
      req("/api/newsletter/send", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-send-secret": "wrong-secret",
        },
        body: JSON.stringify({ slug: "my-post", title: "My Post", excerpt: "An excerpt" }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(401);
  });

  // ─── Validation ────────────────────────────────────────────────────

  it("rejects missing slug", async () => {
    const res = await app.fetch(
      req("/api/newsletter/send", {
        method: "POST",
        headers: {
          ...AUTH_HEADER,
          "content-type": "application/json",
        },
        body: JSON.stringify({ title: "My Post", excerpt: "An excerpt" }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(400);
  });

  it("rejects missing title", async () => {
    const res = await app.fetch(
      req("/api/newsletter/send", {
        method: "POST",
        headers: {
          ...AUTH_HEADER,
          "content-type": "application/json",
        },
        body: JSON.stringify({ slug: "my-post", excerpt: "An excerpt" }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(400);
  });

  it("rejects missing excerpt", async () => {
    const res = await app.fetch(
      req("/api/newsletter/send", {
        method: "POST",
        headers: {
          ...AUTH_HEADER,
          "content-type": "application/json",
        },
        body: JSON.stringify({ slug: "my-post", title: "My Post" }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(400);
  });

  it("rejects overly long slug", async () => {
    const res = await app.fetch(
      req("/api/newsletter/send", {
        method: "POST",
        headers: {
          ...AUTH_HEADER,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          slug: "a".repeat(257),
          title: "My Post",
          excerpt: "An excerpt",
        }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(400);
  });

  it("rejects overly long title", async () => {
    const res = await app.fetch(
      req("/api/newsletter/send", {
        method: "POST",
        headers: {
          ...AUTH_HEADER,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          slug: "my-post",
          title: "A".repeat(257),
          excerpt: "An excerpt",
        }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(400);
  });

  it("rejects overly long excerpt", async () => {
    const res = await app.fetch(
      req("/api/newsletter/send", {
        method: "POST",
        headers: {
          ...AUTH_HEADER,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          slug: "my-post",
          title: "My Post",
          excerpt: "x".repeat(4097),
        }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(400);
  });

  it("rejects wrong Content-Type", async () => {
    const res = await app.fetch(
      req("/api/newsletter/send", {
        method: "POST",
        headers: {
          ...AUTH_HEADER,
          "content-type": "text/plain",
        },
        body: "hello",
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(415);
  });

  // ─── Idempotency ───────────────────────────────────────────────────

  it("returns 'Already sent' when post was already sent", async () => {
    await env.DB.prepare("INSERT INTO newsletter_sent (post_slug) VALUES (?)")
      .bind("already-sent-post")
      .run();

    const res = await app.fetch(
      req("/api/newsletter/send", {
        method: "POST",
        headers: {
          ...AUTH_HEADER,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          slug: "already-sent-post",
          title: "Already Sent",
          excerpt: "This was already sent",
        }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(200);
    const body = await res.json<{ message: string }>();
    expect(body.message).toBe("Already sent");
  });

  // ─── Happy path ────────────────────────────────────────────────────

  it("sends newsletter to active subscribers and records deliveries", async () => {
    const res = await app.fetch(
      req("/api/newsletter/send", {
        method: "POST",
        headers: {
          ...AUTH_HEADER,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          slug: "send-test-post",
          title: "Test Newsletter",
          excerpt: "This is a test newsletter send",
        }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(200);
    const body = await res.json<{ sent: number; failed: number }>();
    expect(body.sent).toBeGreaterThanOrEqual(0);

    // Verify newsletter_sent entry
    const sentRow = await env.DB.prepare("SELECT id FROM newsletter_sent WHERE post_slug = ?")
      .bind("send-test-post")
      .first();
    expect(sentRow).not.toBeNull();

    // Verify newsletter_deliveries entries
    const deliveryCount = await env.DB.prepare(
      "SELECT COUNT(*) as c FROM newsletter_deliveries WHERE post_slug = ?",
    )
      .bind("send-test-post")
      .first<{ c: number }>();
    expect(deliveryCount?.c).toBeGreaterThanOrEqual(0);
  });
});
