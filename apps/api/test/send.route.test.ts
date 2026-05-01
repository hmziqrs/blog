import { env, createExecutionContext } from "cloudflare:test";
import { describe, expect, it, beforeAll, afterEach } from "vitest";
import app from "../src/app";
import type { NewsletterMessage } from "../src/modules/newsletter/queue";

const ctx = createExecutionContext();

function req(path: string, init?: RequestInit) {
  return new Request(`http://localhost${path}`, init);
}

describe("POST /api/newsletter/send", () => {
  const AUTH_HEADER = { "x-send-secret": "local-dev-secret" };

  beforeAll(async () => {
    await env.DB.prepare(
      "INSERT OR IGNORE INTO subscribers (id, email, status, unsubscribe_token) VALUES (?, ?, 'active', ?)",
    )
      .bind("send-sub-1", "sendtest-1@example.com", "unsub-send-1")
      .run();
    await env.DB.prepare(
      "INSERT OR IGNORE INTO subscribers (id, email, status, unsubscribe_token) VALUES (?, ?, 'active', ?)",
    )
      .bind("send-sub-2", "sendtest-2@example.com", "unsub-send-2")
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

  it("queues newsletter messages for all active subscribers", async () => {
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
    const body = await res.json<{ queued: number }>();
    expect(body.queued).toBe(2);

    const sentRow = await env.DB.prepare("SELECT id FROM newsletter_sent WHERE post_slug = ?")
      .bind("send-test-post")
      .first();
    expect(sentRow).not.toBeNull();
  });

  it("enqueues correct message shape per subscriber", async () => {
    const batchCalls: { body: NewsletterMessage }[][] = [];
    const originalSendBatch = env.NEWSLETTER_QUEUE.sendBatch.bind(env.NEWSLETTER_QUEUE);
    env.NEWSLETTER_QUEUE.sendBatch = async (messages: { body: NewsletterMessage }[]) => {
      batchCalls.push([...messages]);
    };

    try {
      const res = await app.fetch(
        req("/api/newsletter/send", {
          method: "POST",
          headers: {
            ...AUTH_HEADER,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            slug: "shape-test-post",
            title: "Shape Test",
            excerpt: "Shape excerpt",
          }),
        }),
        env,
        ctx,
      );
      expect(res.status).toBe(200);

      expect(batchCalls.length).toBe(1);
      expect(batchCalls[0].length).toBe(2);

      const first = batchCalls[0][0].body;
      expect(first.postSlug).toBe("shape-test-post");
      expect(first.postTitle).toBe("Shape Test");
      expect(first.postExcerpt).toBe("Shape excerpt");
      expect(first.subscriberEmail).toBe("sendtest-1@example.com");
      expect(first.unsubscribeToken).toBe("unsub-send-1");

      const second = batchCalls[0][1].body;
      expect(second.subscriberEmail).toBe("sendtest-2@example.com");
      expect(second.unsubscribeToken).toBe("unsub-send-2");
    } finally {
      env.NEWSLETTER_QUEUE.sendBatch = originalSendBatch;
    }
  });

  it("returns queued: 0 when there are no subscribers", async () => {
    await env.DB.prepare("DELETE FROM subscribers").run();

    try {
      const res = await app.fetch(
        req("/api/newsletter/send", {
          method: "POST",
          headers: {
            ...AUTH_HEADER,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            slug: "no-subscribers-post",
            title: "No Subscribers",
            excerpt: "Nobody here",
          }),
        }),
        env,
        ctx,
      );
      expect(res.status).toBe(200);
      const body = await res.json<{ queued: number }>();
      expect(body.queued).toBe(0);
    } finally {
      await env.DB.prepare(
        "INSERT OR IGNORE INTO subscribers (id, email, status, unsubscribe_token) VALUES (?, ?, 'active', ?)",
      )
        .bind("send-sub-1", "sendtest-1@example.com", "unsub-send-1")
        .run();
      await env.DB.prepare(
        "INSERT OR IGNORE INTO subscribers (id, email, status, unsubscribe_token) VALUES (?, ?, 'active', ?)",
      )
        .bind("send-sub-2", "sendtest-2@example.com", "unsub-send-2")
        .run();
    }
  });

  describe("sendBatch chunking", () => {
    it("chunks into multiple sendBatch calls when subscribers exceed 100", async () => {
      // Seed 105 subscribers
      const stmt = env.DB.prepare(
        "INSERT INTO subscribers (id, email, status, unsubscribe_token) VALUES (?, ?, 'active', ?)",
      );
      const batch: Promise<unknown>[] = [];
      for (let i = 1; i <= 105; i++) {
        batch.push(stmt.bind(`chunk-sub-${i}`, `chunk-${i}@example.com`, `unsub-chunk-${i}`).run());
      }
      await Promise.all(batch);

      const batchCalls: unknown[][] = [];
      const originalSendBatch = env.NEWSLETTER_QUEUE.sendBatch.bind(env.NEWSLETTER_QUEUE);
      env.NEWSLETTER_QUEUE.sendBatch = async (messages: unknown[]) => {
        batchCalls.push([...messages]);
      };

      try {
        const res = await app.fetch(
          req("/api/newsletter/send", {
            method: "POST",
            headers: {
              ...AUTH_HEADER,
              "content-type": "application/json",
            },
            body: JSON.stringify({
              slug: "chunk-test-post",
              title: "Chunk Test",
              excerpt: "Chunk excerpt",
            }),
          }),
          env,
          ctx,
        );
        expect(res.status).toBe(200);
        const body = await res.json<{ queued: number }>();
        expect(body.queued).toBe(107); // 105 + 2 pre-existing

        expect(batchCalls.length).toBe(2);
        expect(batchCalls[0].length).toBe(100);
        expect(batchCalls[1].length).toBe(7);
      } finally {
        env.NEWSLETTER_QUEUE.sendBatch = originalSendBatch;
        await env.DB.prepare(
          "DELETE FROM subscribers WHERE email LIKE 'chunk-%@example.com'",
        ).run();
      }
    });
  });
});
