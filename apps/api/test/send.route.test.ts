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
    await env.DB.prepare(
      "INSERT OR IGNORE INTO subscribers (id, email, status, unsubscribe_token_hash) VALUES (?, ?, 'active', ?)",
    )
      .bind("send-sub-1", "sendtest-1@example.com", "hash-send-1")
      .run();
    await env.DB.prepare(
      "INSERT OR IGNORE INTO subscribers (id, email, status, unsubscribe_token_hash) VALUES (?, ?, 'active', ?)",
    )
      .bind("send-sub-2", "sendtest-2@example.com", "hash-send-2")
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
        body: JSON.stringify({ slug: "my-post", subject: "My Post", htmlBody: "<p>An excerpt</p>" }),
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
        body: JSON.stringify({ slug: "my-post", subject: "My Post", htmlBody: "<p>An excerpt</p>" }),
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
        body: JSON.stringify({ subject: "My Post", htmlBody: "<p>An excerpt</p>" }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(400);
  });

  it("rejects missing subject", async () => {
    const res = await app.fetch(
      req("/api/newsletter/send", {
        method: "POST",
        headers: {
          ...AUTH_HEADER,
          "content-type": "application/json",
        },
        body: JSON.stringify({ slug: "my-post", htmlBody: "<p>An excerpt</p>" }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(400);
  });

  it("rejects missing htmlBody", async () => {
    const res = await app.fetch(
      req("/api/newsletter/send", {
        method: "POST",
        headers: {
          ...AUTH_HEADER,
          "content-type": "application/json",
        },
        body: JSON.stringify({ slug: "my-post", subject: "My Post" }),
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
          subject: "My Post",
          htmlBody: "<p>An excerpt</p>",
        }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(400);
  });

  it("rejects overly long subject", async () => {
    const res = await app.fetch(
      req("/api/newsletter/send", {
        method: "POST",
        headers: {
          ...AUTH_HEADER,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          slug: "my-post",
          subject: "A".repeat(257),
          htmlBody: "<p>An excerpt</p>",
        }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(400);
  });

  it("rejects overly long htmlBody", async () => {
    const res = await app.fetch(
      req("/api/newsletter/send", {
        method: "POST",
        headers: {
          ...AUTH_HEADER,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          slug: "my-post",
          subject: "My Post",
          htmlBody: "x".repeat(100_001),
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
        body: JSON.stringify({ slug: "My Post", subject: "My Post", htmlBody: "<p>An excerpt</p>" }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("Invalid slug format");
  });

  // L4: Spoofed Content-Type
  it("rejects spoofed Content-Type like application/json-pretend", async () => {
    const res = await app.fetch(
      req("/api/newsletter/send", {
        method: "POST",
        headers: { ...AUTH_HEADER, "content-type": "application/json-pretend" },
        body: JSON.stringify({ slug: "my-post", subject: "My Post", htmlBody: "<p>An excerpt</p>" }),
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
        body: JSON.stringify({ slug: "my-post", subject: "My Post", htmlBody: "<p>An excerpt</p>" }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(401);
  });

  // ─── Idempotency ───────────────────────────────────────────────────

  it("returns 'Already sent' when issue was already sent", async () => {
    await env.DB.prepare("INSERT INTO newsletter_sent (issue_slug) VALUES (?)")
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
          subject: "Already Sent",
          htmlBody: "<p>This was already sent</p>",
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
          subject: "Test Newsletter",
          htmlBody: "<p>This is a test newsletter send</p>",
        }),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { queued: number };
    expect(body.queued).toBe(2);

    const sentRow = await env.DB.prepare("SELECT id FROM newsletter_sent WHERE issue_slug = ?")
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
            subject: "Shape Test",
            htmlBody: "<p>Shape excerpt</p>",
          }),
        }),
        env,
        ctx,
      );
      expect(res.status).toBe(200);

      expect(batchCalls.length).toBe(1);
      expect(batchCalls[0]!.length).toBe(2);

      const first = batchCalls[0]![0]!.body;
      expect(first.issueSlug).toBe("shape-test-post");
      expect(first.subject).toBe("Shape Test");
      expect(first.htmlBody).toBe("<p>Shape excerpt</p>");
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
            subject: "No Subscribers",
            htmlBody: "<p>Nobody here</p>",
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
        "INSERT OR IGNORE INTO subscribers (id, email, status, unsubscribe_token_hash) VALUES (?, ?, 'active', ?)",
      )
        .bind("send-sub-1", "sendtest-1@example.com", "hash-send-1")
        .run();
      await env.DB.prepare(
        "INSERT OR IGNORE INTO subscribers (id, email, status, unsubscribe_token_hash) VALUES (?, ?, 'active', ?)",
      )
        .bind("send-sub-2", "sendtest-2@example.com", "hash-send-2")
        .run();
    }
  });

  // H2a: Concurrent send requests for same slug — only one should enqueue
  it("prevents duplicate enqueue from concurrent send requests", async () => {
    // Clean slate for this slug
    await env.DB.prepare("DELETE FROM newsletter_sent WHERE issue_slug = ?")
      .bind("concurrent-post")
      .run();
    await env.DB.prepare("DELETE FROM newsletter_deliveries WHERE issue_slug = ?")
      .bind("concurrent-post")
      .run();

    const batchCalls: NewsletterQueueMessage[][] = [];
    const originalSendBatch = env.NEWSLETTER_QUEUE.sendBatch.bind(env.NEWSLETTER_QUEUE);
    env.NEWSLETTER_QUEUE.sendBatch = async (messages: Iterable<NewsletterQueueMessage>) => {
      batchCalls.push([...messages]);
    };

    try {
      const reqBody = JSON.stringify({
        slug: "concurrent-post",
        subject: "Concurrent",
        htmlBody: "<p>Testing race</p>",
      });

      const [res1, res2] = await Promise.all([
        app.fetch(
          req("/api/newsletter/send", {
            method: "POST",
            headers: { ...AUTH_HEADER, "content-type": "application/json" },
            body: reqBody,
          }),
          env,
          ctx,
        ),
        app.fetch(
          req("/api/newsletter/send", {
            method: "POST",
            headers: { ...AUTH_HEADER, "content-type": "application/json" },
            body: reqBody,
          }),
          env,
          ctx,
        ),
      ]);

      // Both should return 200 (one enqueued, one already sent)
      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);

      // Exactly one of them should have enqueued
      const bodies = await Promise.all([
        res1.json() as Promise<{ queued?: number; message?: string }>,
        res2.json() as Promise<{ queued?: number; message?: string }>,
      ]);
      const enqueued = bodies.filter((b) => b.queued !== undefined);
      const alreadySent = bodies.filter((b) => b.message === "Already sent");
      expect(enqueued.length).toBe(1);
      expect(alreadySent.length).toBe(1);

      // Exactly one row in newsletter_sent
      const count = await env.DB.prepare(
        "SELECT COUNT(*) as c FROM newsletter_sent WHERE issue_slug = ?",
      )
        .bind("concurrent-post")
        .first<{ c: number }>();
      expect(count?.c).toBe(1);
    } finally {
      env.NEWSLETTER_QUEUE.sendBatch = originalSendBatch;
    }
  });

  // M6: Unsubscribed emails are not enqueued
  it("does not enqueue unsubscribed subscribers", async () => {
    await env.DB.prepare("DELETE FROM subscribers").run();
    await env.DB.prepare("DELETE FROM newsletter_sent WHERE issue_slug = ?")
      .bind("unsub-filter-post")
      .run();

    // Insert one active and one unsubscribed subscriber
    await env.DB.prepare(
      "INSERT INTO subscribers (id, email, status, unsubscribe_token_hash) VALUES (?, ?, 'active', ?)",
    )
      .bind("active-sub", "active@example.com", "hash-a")
      .run();
    await env.DB.prepare(
      "INSERT INTO subscribers (id, email, status, unsubscribe_token_hash) VALUES (?, ?, 'unsubscribed', ?)",
    )
      .bind("unsub-sub", "unsub@example.com", "hash-u")
      .run();

    const batchCalls: NewsletterQueueMessage[][] = [];
    const originalSendBatch = env.NEWSLETTER_QUEUE.sendBatch.bind(env.NEWSLETTER_QUEUE);
    env.NEWSLETTER_QUEUE.sendBatch = async (messages: Iterable<NewsletterQueueMessage>) => {
      batchCalls.push([...messages]);
    };

    try {
      const res = await app.fetch(
        req("/api/newsletter/send", {
          method: "POST",
          headers: { ...AUTH_HEADER, "content-type": "application/json" },
          body: JSON.stringify({
            slug: "unsub-filter-post",
            subject: "Unsub Filter",
            htmlBody: "<p>Testing filter</p>",
          }),
        }),
        env,
        ctx,
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as { queued: number };
      expect(body.queued).toBe(1);

      expect(batchCalls.length).toBe(1);
      expect(batchCalls[0]!.length).toBe(1);
      expect(batchCalls[0]![0]!.body.subscriberEmail).toBe("active@example.com");
    } finally {
      env.NEWSLETTER_QUEUE.sendBatch = originalSendBatch;
      // Restore default subscribers for other tests
      await env.DB.prepare("DELETE FROM subscribers").run();
      await env.DB.prepare(
        "INSERT OR IGNORE INTO subscribers (id, email, status, unsubscribe_token_hash) VALUES (?, ?, 'active', ?)",
      )
        .bind("send-sub-1", "sendtest-1@example.com", "hash-send-1")
        .run();
      await env.DB.prepare(
        "INSERT OR IGNORE INTO subscribers (id, email, status, unsubscribe_token_hash) VALUES (?, ?, 'active', ?)",
      )
        .bind("send-sub-2", "sendtest-2@example.com", "hash-send-2")
        .run();
    }
  });

  describe("sendBatch chunking", () => {
    it("chunks into multiple sendBatch calls when subscribers exceed 100", async () => {
      // Seed 105 subscribers
      const stmt = env.DB.prepare(
        "INSERT INTO subscribers (id, email, status, unsubscribe_token_hash) VALUES (?, ?, 'active', ?)",
      );
      const batch: Promise<D1Result>[] = [];
      for (let i = 1; i <= 105; i++) {
        batch.push(stmt.bind(`chunk-sub-${i}`, `chunk-${i}@example.com`, `hash-chunk-${i}`).run());
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
              subject: "Chunk Test",
              htmlBody: "<p>Chunk excerpt</p>",
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
