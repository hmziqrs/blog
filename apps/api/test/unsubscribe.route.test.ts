import { env, createExecutionContext } from "cloudflare:test";
import { describe, expect, it, afterEach } from "vitest";
import app from "../src/app";

const ctx = createExecutionContext();

function req(path: string, init?: RequestInit) {
  return new Request(`http://localhost${path}`, init);
}

describe("POST /api/newsletter/unsubscribe", () => {
  afterEach(async () => {
    await env.DB.prepare("DELETE FROM subscribers").run();
    const list = await env.RATE_LIMIT_KV.list();
    await Promise.all(list.keys.map((k: { name: string }) => env.RATE_LIMIT_KV.delete(k.name)));
  });

  async function createSubscriber(email: string): Promise<string> {
    const token = crypto.randomUUID();
    const id = crypto.randomUUID();
    await env.DB.prepare(
      "INSERT INTO subscribers (id, email, status, unsubscribe_token) VALUES (?, ?, 'active', ?)",
    )
      .bind(id, email, token)
      .run();
    return token;
  }

  // ─── Validation ────────────────────────────────────────────────────

  it("rejects wrong Content-Type", async () => {
    const res = await app.fetch(
      req("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: "hello",
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(415);
  });

  it("rejects empty token", async () => {
    const res = await app.fetch(
      req("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "" }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(400);
  });

  it("rejects missing token", async () => {
    const res = await app.fetch(
      req("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(400);
  });

  // ─── Happy path — POST ─────────────────────────────────────────────

  it("unsubscribes successfully via POST", async () => {
    const token = await createSubscriber("test-unsub@example.com");

    const res = await app.fetch(
      req("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { message: string };
    expect(body.message).toBe("Successfully unsubscribed");
  });

  it("deletes subscriber from DB after unsubscribe", async () => {
    const token = await createSubscriber("test-delete@example.com");

    await app.fetch(
      req("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      }),
      env,
      ctx,
    );

    const row = await env.DB.prepare("SELECT id FROM subscribers WHERE email = ?")
      .bind("test-delete@example.com")
      .first();
    expect(row).toBeNull();
  });

  it("returns 404 for invalid unsubscribe token", async () => {
    const res = await app.fetch(
      req("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "nonexistent-token" }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Invalid unsubscribe token");
  });

  // ─── Rate limiting ─────────────────────────────────────────────────

  it("rate-limits unsubscribe after 3 requests from same IP", async () => {
    const headers = {
      "content-type": "application/json",
      "CF-Connecting-IP": "9.9.9.9",
    };

    for (let i = 1; i <= 3; i++) {
      const res = await app.fetch(
        new Request("http://localhost/api/newsletter/unsubscribe", {
          method: "POST",
          headers,
          body: JSON.stringify({ token: `token-${i}` }),
        }),
        env,
        ctx,
      );
      // 404 is fine — rate limit entry still recorded
      expect(res.status).toBe(404);
    }

    const res = await app.fetch(
      new Request("http://localhost/api/newsletter/unsubscribe", {
        method: "POST",
        headers,
        body: JSON.stringify({ token: "token-4" }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(429);
  });

  // ─── GET path ──────────────────────────────────────────────────────

  it("unsubscribes successfully via GET", async () => {
    const token = await createSubscriber("test-get@example.com");

    const res = await app.fetch(
      req(`/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`),
      env,
      ctx,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { message: string };
    expect(body.message).toBe("Successfully unsubscribed");
  });

  it("GET returns 400 for missing token", async () => {
    const res = await app.fetch(req("/api/newsletter/unsubscribe"), env, ctx);
    expect(res.status).toBe(400);
  });

  it("GET returns 404 for invalid token", async () => {
    const res = await app.fetch(req("/api/newsletter/unsubscribe?token=nonexistent"), env, ctx);
    expect(res.status).toBe(404);
  });
});
