import { env, createExecutionContext } from "cloudflare:test";
import { describe, expect, it, afterEach } from "vitest";
import app from "../src/app";
import { deriveUnsubscribeToken, hashToken } from "../src/lib/tokens";

const ctx = createExecutionContext();

function req(path: string, init?: RequestInit) {
  return new Request(`http://localhost${path}`, init);
}

describe("POST /api/newsletter/unsubscribe", () => {
  let originalEnvironment: string;

  afterEach(async () => {
    if (originalEnvironment) env.ENVIRONMENT = originalEnvironment;
    await env.DB.prepare("DELETE FROM subscribers").run();
    await env.RATE_LIMIT_KV.delete("rl:ip:1.1.1.1");
    await env.RATE_LIMIT_KV.delete("rl:ip:9.9.9.9");
  });

  async function createSubscriber(email: string): Promise<string> {
    const id = crypto.randomUUID();
    const token = await deriveUnsubscribeToken(env.NEWSLETTER_SEND_SECRET, id);
    const tokenHash = await hashToken(token);
    await env.DB.prepare(
      "INSERT INTO subscribers (id, email, status, unsubscribe_token_hash) VALUES (?, ?, 'active', ?)",
    )
      .bind(id, email, tokenHash)
      .run();
    return token;
  }

  // GET handler supports single-click unsubscribe from email links
  it("unsubscribes via GET with token query param", async () => {
    originalEnvironment = env.ENVIRONMENT;
    env.ENVIRONMENT = "test";
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

  it("returns 400 when GET is missing token", async () => {
    originalEnvironment = env.ENVIRONMENT;
    env.ENVIRONMENT = "test";
    const res = await app.fetch(req("/api/newsletter/unsubscribe"), env, ctx);
    expect(res.status).toBe(400);
  });

  // Validation
  it("rejects wrong Content-Type", async () => {
    const res = await app.fetch(
      req("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: {
          "content-type": "text/plain",
          "CF-Connecting-IP": "1.1.1.1",
        },
        body: "hello",
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(415);
  });

  // L4: strict Content-Type
  it("rejects spoofed Content-Type like application/json-pretend", async () => {
    const res = await app.fetch(
      req("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: {
          "content-type": "application/json-pretend",
          "CF-Connecting-IP": "1.1.1.1",
        },
        body: JSON.stringify({ token: "some-token" }),
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
        headers: {
          "content-type": "application/json",
          "CF-Connecting-IP": "1.1.1.1",
        },
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
        headers: {
          "content-type": "application/json",
          "CF-Connecting-IP": "1.1.1.1",
        },
        body: JSON.stringify({}),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(400);
  });

  // Happy path — POST
  it("unsubscribes successfully via POST", async () => {
    const token = await createSubscriber("test-unsub@example.com");
    const res = await app.fetch(
      req("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "CF-Connecting-IP": "1.1.1.1",
        },
        body: JSON.stringify({ token }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { message: string };
    expect(body.message).toBe("Successfully unsubscribed");
  });

  // M6: soft-delete instead of hard-delete
  it("soft-deletes subscriber (sets status to unsubscribed)", async () => {
    const token = await createSubscriber("test-soft@example.com");
    await app.fetch(
      req("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "CF-Connecting-IP": "1.1.1.1",
        },
        body: JSON.stringify({ token }),
      }),
      env,
      ctx,
    );

    const row = await env.DB.prepare(
      "SELECT id, status, unsubscribed_at FROM subscribers WHERE email = ?",
    )
      .bind("test-soft@example.com")
      .first<{ id: string; status: string; unsubscribed_at: string | null }>();
    expect(row).not.toBeNull();
    expect(row?.status).toBe("unsubscribed");
    expect(row?.unsubscribed_at).not.toBeNull();
  });

  it("returns 404 for invalid unsubscribe token", async () => {
    const res = await app.fetch(
      req("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "CF-Connecting-IP": "1.1.1.1",
        },
        body: JSON.stringify({ token: "nonexistent-token" }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Invalid unsubscribe token");
  });

  // Rate limiting
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

  // L5: Missing CF-Connecting-IP in production
  it("rejects missing CF-Connecting-IP in production", async () => {
    originalEnvironment = env.ENVIRONMENT;
    env.ENVIRONMENT = "production";
    const res = await app.fetch(
      req("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: "some-token" }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(400);
  });
});
