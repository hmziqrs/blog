import { env, createExecutionContext, createMessageBatch, getQueueResult } from "cloudflare:test";
import { describe, expect, it, afterEach } from "vitest";
import app from "../src/app";
import worker from "../src/index";
import type { NewsletterMessage } from "../src/modules/newsletter/queue";

const ctx = createExecutionContext();

describe("Complete end-to-end newsletter flow", () => {
  afterEach(async () => {
    // Delete in dependency order (children before parents due to FK constraints)
    await env.DB.prepare("DELETE FROM newsletter_deliveries WHERE post_slug = ?")
      .bind("e2e-flow-post")
      .run();
    await env.DB.prepare("DELETE FROM newsletter_deliveries WHERE post_slug = ?")
      .bind("unsub-test-post")
      .run();
    await env.DB.prepare("DELETE FROM newsletter_sent WHERE post_slug = ?")
      .bind("e2e-flow-post")
      .run();
    await env.DB.prepare("DELETE FROM newsletter_sent WHERE post_slug = ?")
      .bind("unsub-test-post")
      .run();
    await env.DB.prepare("DELETE FROM subscribers WHERE email = ?")
      .bind("e2e-new@example.com")
      .run();
    await env.DB.prepare("DELETE FROM subscribers WHERE email LIKE 'e2e-%@example.com'").run();
    const list = await env.RATE_LIMIT_KV.list();
    await Promise.all(list.keys.map((k) => env.RATE_LIMIT_KV.delete(k.name)));
  });

  it("subscribe → send → queue → consumer → email → delivery record", async () => {
    // ─── Phase 1: Subscribe a new user ────────────────────────────────
    const subscribeRes = await app.fetch(
      new Request("http://localhost/api/newsletter/subscribe", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "CF-Connecting-IP": "192.168.1.1",
        },
        body: JSON.stringify({
          email: "e2e-new@example.com",
          token: "dummy-token-any-value-works-with-test-key",
        }),
      }),
      env,
      ctx,
    );
    expect(subscribeRes.status).toBe(201);
    const subscribeBody = await subscribeRes.json<{ message: string }>();
    expect(subscribeBody.message).toBe("Subscribed");

    // Verify subscriber exists in D1
    const subscriber = await env.DB.prepare(
      "SELECT id, email, unsubscribe_token FROM subscribers WHERE email = ? AND status = 'active'",
    )
      .bind("e2e-new@example.com")
      .first<{ id: string; email: string; unsubscribe_token: string }>();
    expect(subscriber).not.toBeNull();
    const subscriberId = subscriber!.id;
    const unsubscribeToken = subscriber!.unsubscribe_token;

    // ─── Phase 2: Send newsletter ─────────────────────────────────────
    const capturedMessages: NewsletterMessage[] = [];
    const originalSendBatch = env.NEWSLETTER_QUEUE.sendBatch.bind(env.NEWSLETTER_QUEUE);
    env.NEWSLETTER_QUEUE.sendBatch = async (messages: { body: NewsletterMessage }[]) => {
      for (const m of messages) capturedMessages.push(m.body);
    };

    let sendRes: Response;
    try {
      sendRes = await app.fetch(
        new Request("http://localhost/api/newsletter/send", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-send-secret": "local-dev-secret",
          },
          body: JSON.stringify({
            slug: "e2e-flow-post",
            title: "E2E Flow Post",
            excerpt: "This is the complete flow test",
          }),
        }),
        env,
        ctx,
      );
    } finally {
      env.NEWSLETTER_QUEUE.sendBatch = originalSendBatch;
    }

    expect(sendRes!.status).toBe(200);
    const sendBody = await sendRes!.json<{ queued: number }>();
    expect(sendBody.queued).toBe(1);

    // Verify the exact message shape
    expect(capturedMessages.length).toBe(1);
    const msg = capturedMessages[0];
    expect(msg.postSlug).toBe("e2e-flow-post");
    expect(msg.postTitle).toBe("E2E Flow Post");
    expect(msg.subscriberId).toBe(subscriberId);
    expect(msg.subscriberEmail).toBe("e2e-new@example.com");
    expect(msg.unsubscribeToken).toBe(unsubscribeToken);

    // ─── Phase 3: Process queue message ───────────────────────────────
    const sentEmails: { to: string; subject: string; html: string }[] = [];
    const originalSend = env.SEND_EMAIL.send;
    env.SEND_EMAIL.send = async (opts: { to: string; subject: string; html?: string }) => {
      sentEmails.push({ to: opts.to, subject: opts.subject, html: opts.html ?? "" });
    };

    try {
      const batch = createMessageBatch("newsletter-send", [
        {
          id: "e2e-msg",
          timestamp: new Date(),
          attempts: 1,
          body: msg,
        },
      ]);

      const queueCtx = createExecutionContext();
      await worker.queue(batch, env, queueCtx);
      const result = await getQueueResult(batch, queueCtx);

      expect(result.explicitAcks).toStrictEqual(["e2e-msg"]);
      expect(result.retryMessages).toStrictEqual([]);

      // ─── Phase 4: Verify email was sent ─────────────────────────────
      expect(sentEmails.length).toBe(1);
      expect(sentEmails[0].to).toBe("e2e-new@example.com");
      expect(sentEmails[0].subject).toBe("New Post: E2E Flow Post");
      expect(sentEmails[0].html).toContain("e2e-flow-post");
      expect(sentEmails[0].html).toContain(unsubscribeToken);

      // ─── Phase 5: Verify delivery recorded in D1 ────────────────────
      const delivery = await env.DB.prepare(
        "SELECT status, subscriber_id FROM newsletter_deliveries WHERE post_slug = ? AND subscriber_id = ?",
      )
        .bind("e2e-flow-post", subscriberId)
        .first<{ status: string; subscriber_id: string }>();

      expect(delivery).not.toBeNull();
      expect(delivery?.status).toBe("sent");
      expect(delivery?.subscriber_id).toBe(subscriberId);
    } finally {
      env.SEND_EMAIL.send = originalSend;
    }
  });

  it("unsubscribe removes subscriber and they no longer receive emails", async () => {
    // Seed subscriber
    await env.DB.prepare(
      "INSERT INTO subscribers (id, email, status, unsubscribe_token) VALUES (?, ?, 'active', ?)",
    )
      .bind("e2e-unsub", "e2e-unsub@example.com", "unsub-token-123")
      .run();

    // Unsubscribe
    const unsubRes = await app.fetch(
      new Request("http://localhost/api/newsletter/unsubscribe", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "CF-Connecting-IP": "10.0.0.1",
        },
        body: JSON.stringify({ token: "unsub-token-123" }),
      }),
      env,
      ctx,
    );
    expect(unsubRes.status).toBe(200);

    // Verify deleted
    const row = await env.DB.prepare("SELECT id FROM subscribers WHERE id = ?")
      .bind("e2e-unsub")
      .first();
    expect(row).toBeNull();

    // Send newsletter — should enqueue 0 for this user
    const capturedMessages: NewsletterMessage[] = [];
    const originalSendBatch = env.NEWSLETTER_QUEUE.sendBatch.bind(env.NEWSLETTER_QUEUE);
    env.NEWSLETTER_QUEUE.sendBatch = async (messages: { body: NewsletterMessage }[]) => {
      for (const m of messages) capturedMessages.push(m.body);
    };

    try {
      const sendRes = await app.fetch(
        new Request("http://localhost/api/newsletter/send", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-send-secret": "local-dev-secret",
          },
          body: JSON.stringify({
            slug: "unsub-test-post",
            title: "After Unsubscribe",
            excerpt: "Should not reach unsubscribed user",
          }),
        }),
        env,
        ctx,
      );
      expect(sendRes.status).toBe(200);

      // This user should not be in the captured messages
      const forUnsubUser = capturedMessages.filter((m) => m.subscriberId === "e2e-unsub");
      expect(forUnsubUser.length).toBe(0);
    } finally {
      env.NEWSLETTER_QUEUE.sendBatch = originalSendBatch;
      await env.DB.prepare("DELETE FROM newsletter_sent WHERE post_slug = ?")
        .bind("unsub-test-post")
        .run();
    }
  });

  it("rate-limited IP cannot subscribe, but other IPs can", async () => {
    const blockedIp = "99.99.99.99";

    // Exhaust rate limit for this IP
    for (let i = 1; i <= 2; i++) {
      const res = await app.fetch(
        new Request("http://localhost/api/newsletter/subscribe", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "CF-Connecting-IP": blockedIp,
          },
          body: JSON.stringify({ email: `e2e-rl${i}@example.com`, token: "abc123" }),
        }),
        env,
        ctx,
      );
      expect(res.status).toBe(201);
    }

    // Third attempt blocked
    const blockedRes = await app.fetch(
      new Request("http://localhost/api/newsletter/subscribe", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "CF-Connecting-IP": blockedIp,
        },
        body: JSON.stringify({ email: "e2e-rl3@example.com", token: "abc123" }),
      }),
      env,
      ctx,
    );
    expect(blockedRes.status).toBe(429);

    // Different IP still works
    const allowedRes = await app.fetch(
      new Request("http://localhost/api/newsletter/subscribe", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "CF-Connecting-IP": "88.88.88.88",
        },
        body: JSON.stringify({ email: "e2e-allowed@example.com", token: "abc123" }),
      }),
      env,
      ctx,
    );
    expect(allowedRes.status).toBe(201);
  });
});
