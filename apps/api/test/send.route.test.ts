import { env, createExecutionContext } from "cloudflare:test";
import { describe, expect, it, beforeAll, afterEach } from "vitest";
import app from "../src/app";
import type { NewsletterMessage } from "../src/modules/newsletter/queue";
import type { D1Result, MessageSendRequest } from "@cloudflare/workers-types";
import { deriveUnsubscribeToken } from "../src/lib/tokens";

const ctx = createExecutionContext();
type NewsletterQueueMessage = MessageSendRequest<NewsletterMessage>;

function req(path: string, init?: RequestInit) {
  return new Request(`http://localhost${path}`, init);
}

describe("POST /api/newsletter/send", () => {
  const AUTH_HEADER = { "x-send-secret": "local-dev-secret" };

  beforeAll(async () => {
    // Seed posts table (H2: slug validation)
    await env.DB.prepare(
      "INSERT OR IGNORE INTO posts (slug, title, excerpt) VALUES (?, ?, ?)",
    )
      .bind("my-post", "My Post", "An excerpt")
      .run();
    await env.DB.prepare(
      "INSERT OR IGNORE INTO posts (slug, title, excerpt) VALUES (?, ?, ?)",
    )
      .bind("already-sent-post", "Already Sent", "This was already sent")
      .run();
    await env.DB.prepare(
      "INSERT OR IGNORE INTO posts (slug, title, excerpt) VALUES (?, ?, ?)",
    )
      .bind("send-test-post", "Test Newsletter", "This is a test newsletter send")
      .run();
    await env.DB.prepare(
      "INSERT OR IGNORE INTO posts (slug, title, excerpt) VALUES (?, ?, ?)",
    )
      .bind("shape-test-post", "Shape Test", "Shape excerpt")
      .run();
    await env.DB.prepare(
      "INSERT OR IGNORE INTO posts (slug, title, excerpt) VALUES (?, ?, ?)",
    )
      .bind("no-subscribers-post", "No Subscribers", "Nobody here")
      .run();
    await env.DB.prepare(
      "INSERT OR IGNORE INTO posts (slug, title, excerpt) VALUES (?, ?, ?)",
    )
      .bind("chunk-test-post", "Chunk Test", "Chunk excerpt")
      .run();

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

  // H2b: Slug format validation
  it("rejects invalid slug format", async () => {
    const res = await app.fetch(
      req("/api/newsletter/send", {
        method: "POST",
        headers: { ...AUTH_HEADER, "content-type": "application/json" },
        body: JSON.stringify({ slug: "My Post", title: "My Post", excerpt: "An excerpt" }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Invalid slug format");
  });

  // H2b: Slug not in posts table
  it("rejects unknown slug not in posts table", async () => {
    const res = await app.fetch(
      req("/api/newsletter/send", {
        method: "POST",
        headers: { ...AUTH_HEADER, "content-type": "application/json" },
        body: JSON.stringify({ slug: "nonexistent-post", title: "No", excerpt: "Nope" }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Unknown post slug");
  });

  // L4: Spoofed Content-Type
  it("rejects spoofed Content-Type like application/json-pretend", async () => {
    const res = await app.fetch(
      req("/api/newsletter/send", {
        method: "POST",
        headers: { ...AUTH_HEADER, "content-type": "application/json-pretend" },
        body: JSON.stringify({ slug: "my-post", title: "My Post", excerpt: "An excerpt" }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(415);
  });

  // H3: Timing-safe secret comparison
  it("rejects wrong secret of equal length (timing-safe)", async () => {
    const res = await app.fetch(
      req("/api/newsletter/send", {
        method: "POST",
        headers: {
          "x-send-secret": "wrong-dev-secrax", // 16 chars, same length as "local-dev-secret"
          "content-type": "application/json",
        },
        body: JSON.stringify({ slug: "my-post", title: "My Post", excerpt: "An excerpt" }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(401);
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
    const body = (await res.json()) as { message: string };
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
    const body = (await res.json()) as { queued: number };
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
      expect(batchCalls[0]!.length).toBe(2);

      const first = batchCalls[0]![0]!.body;
      expect(first.postSlug).toBe("shape-test-post");
      expect(first.postTitle).toBe("Shape Test");
      expect(first.postExcerpt).toBe("Shape excerpt");
      expect(first.subscriberEmail).toBe("sendtest-1@example.com");
      const expectedToken1 = await deriveUnsubscribeToken(env.NEWSLETTER_SEND_SECRET, "send-sub-1");
      expect(first.unsubscribeToken).toBe(expectedToken1);

      const second = batchCalls[0]![1]!.body;
      expect(second.subscriberEmail).toBe("sendtest-2@example.com");
      const expectedToken2 = await deriveUnsubscribeToken(env.NEWSLETTER_SEND_SECRET, "send-sub-2");
      expect(second.unsubscribeToken).toBe(expectedToken2);
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
      const body = (await res.json()) as { queued: number };
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
      const batch: Promise<D1Result>[] = [];
      for (let i = 1; i <= 105; i++) {
        batch.push(stmt.bind(`chunk-sub-${i}`, `chunk-${i}@example.com`, `unsub-chunk-${i}`).run());
      }
      await Promise.all(batch);

      const batchCalls: NewsletterQueueMessage[][] = [];
      const originalSendBatch = env.NEWSLETTER_QUEUE.sendBatch.bind(env.NEWSLETTER_QUEUE);
      env.NEWSLETTER_QUEUE.sendBatch = async (messages: Iterable<NewsletterQueueMessage>) => {
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
        const body = (await res.json()) as { queued: number };
        expect(body.queued).toBe(107); // 105 + 2 pre-existing

        expect(batchCalls.length).toBe(2);
        expect(batchCalls[0]!.length).toBe(100);
        expect(batchCalls[1]!.length).toBe(7);
      } finally {
        env.NEWSLETTER_QUEUE.sendBatch = originalSendBatch;
        await env.DB.prepare(
          "DELETE FROM subscribers WHERE email LIKE 'chunk-%@example.com'",
        ).run();
      }
    });
  });
});
