import { env, createExecutionContext, createMessageBatch, getQueueResult } from "cloudflare:test";
import { describe, expect, it, beforeAll, afterEach } from "vitest";
import worker from "../src/index";
import { deriveUnsubscribeToken } from "../src/lib/tokens";

describe("handleQueueBatch", () => {
  beforeAll(async () => {
    await env.DB.prepare(
      "INSERT OR IGNORE INTO subscribers (id, email, status, unsubscribe_token_hash) VALUES (?, ?, 'active', ?)",
    )
      .bind("queue-sub-1", "queue-1@example.com", "hash-q1")
      .run();
    await env.DB.prepare(
      "INSERT OR IGNORE INTO subscribers (id, email, status, unsubscribe_token_hash) VALUES (?, ?, 'active', ?)",
    )
      .bind("queue-sub-2", "queue-2@example.com", "hash-q2")
      .run();
  });

  afterEach(async () => {
    await env.DB.prepare("DELETE FROM newsletter_deliveries").run();
  });

  it("processes message, sends email, records delivery as 'sent'", async () => {
    const batch = createMessageBatch("newsletter-send", [
      {
        id: "msg-1",
        timestamp: new Date(),
        attempts: 1,
        body: {
          postSlug: "queue-test-post",
          postTitle: "Queue Test",
          postExcerpt: "Excerpt",
          subscriberId: "queue-sub-1",
          subscriberEmail: "queue-1@example.com",
          unsubscribeToken: "unsub-q1",
        },
      },
    ]);

    const ctx = createExecutionContext();
    await worker.queue(batch, env, ctx);
    const result = await getQueueResult(batch, ctx);

    expect(result.ackAll).toBe(false);
    expect(result.retryBatch).toMatchObject({ retry: false });
    expect(result.explicitAcks).toStrictEqual(["msg-1"]);
    expect(result.retryMessages).toStrictEqual([]);

    const delivery = await env.DB.prepare(
      "SELECT status FROM newsletter_deliveries WHERE post_slug = ? AND subscriber_id = ?",
    )
      .bind("queue-test-post", "queue-sub-1")
      .first<{ status: string }>();

    expect(delivery?.status).toBe("sent");
  });

  it("acks but does not record delivery for inactive subscriber", async () => {
    const batch = createMessageBatch("newsletter-send", [
      {
        id: "msg-2",
        timestamp: new Date(),
        attempts: 1,
        body: {
          postSlug: "queue-test-post-2",
          postTitle: "Queue Test 2",
          postExcerpt: "Excerpt",
          subscriberId: "nonexistent-sub",
          subscriberEmail: "nobody@example.com",
          unsubscribeToken: "unsub-none",
        },
      },
    ]);

    const ctx = createExecutionContext();
    await worker.queue(batch, env, ctx);
    const result = await getQueueResult(batch, ctx);

    expect(result.retryBatch).toMatchObject({ retry: false });
    expect(result.explicitAcks).toStrictEqual(["msg-2"]);
    expect(result.retryMessages).toStrictEqual([]);

    const delivery = await env.DB.prepare(
      "SELECT id FROM newsletter_deliveries WHERE post_slug = ? AND subscriber_id = ?",
    )
      .bind("queue-test-post-2", "nonexistent-sub")
      .first();

    expect(delivery).toBeNull();
  });

  it("retries message when email send fails", async () => {
    const originalSend = env.SEND_EMAIL.send;
    env.SEND_EMAIL.send = async () => {
      throw new Error("Simulated SMTP failure");
    };

    try {
      const batch = createMessageBatch("newsletter-send", [
        {
          id: "msg-retry",
          timestamp: new Date(),
          attempts: 1,
          body: {
            postSlug: "fail-post",
            postTitle: "Fail Test",
            postExcerpt: "Excerpt",
            subscriberId: "queue-sub-1",
            subscriberEmail: "queue-1@example.com",
            unsubscribeToken: "unsub-q1",
          },
        },
      ]);

      const ctx = createExecutionContext();
      await worker.queue(batch, env, ctx);
      const result = await getQueueResult(batch, ctx);

      expect(result.retryBatch).toMatchObject({ retry: false });
      expect(result.explicitAcks).toStrictEqual([]);
      expect(result.retryMessages).toStrictEqual([{ msgId: "msg-retry" }]);

      const delivery = await env.DB.prepare(
        "SELECT id FROM newsletter_deliveries WHERE post_slug = ? AND subscriber_id = ?",
      )
        .bind("fail-post", "queue-sub-1")
        .first();

      expect(delivery).toBeNull();
    } finally {
      env.SEND_EMAIL.send = originalSend;
    }
  });

  it("handles mixed batch with ack and retry", async () => {
    const originalSend = env.SEND_EMAIL.send;
    let callCount = 0;
    env.SEND_EMAIL.send = async () => {
      callCount++;
      if (callCount === 1) {
        throw new Error("First send fails");
      }
      return { messageId: "test-id" } as import("@cloudflare/workers-types").EmailSendResult;
    };

    try {
      const batch = createMessageBatch("newsletter-send", [
        {
          id: "msg-fail",
          timestamp: new Date(),
          attempts: 1,
          body: {
            postSlug: "mixed-post",
            postTitle: "Mixed",
            postExcerpt: "Excerpt",
            subscriberId: "queue-sub-1",
            subscriberEmail: "queue-1@example.com",
            unsubscribeToken: "unsub-q1",
          },
        },
        {
          id: "msg-ok",
          timestamp: new Date(),
          attempts: 1,
          body: {
            postSlug: "mixed-post",
            postTitle: "Mixed",
            postExcerpt: "Excerpt",
            subscriberId: "queue-sub-2",
            subscriberEmail: "queue-2@example.com",
            unsubscribeToken: "unsub-q2",
          },
        },
      ]);

      const ctx = createExecutionContext();
      await worker.queue(batch, env, ctx);
      const result = await getQueueResult(batch, ctx);

      expect(result.retryBatch).toMatchObject({ retry: false });
      expect(result.explicitAcks).toStrictEqual(["msg-ok"]);
      expect(result.retryMessages).toStrictEqual([{ msgId: "msg-fail" }]);

      const okDelivery = await env.DB.prepare(
        "SELECT status FROM newsletter_deliveries WHERE post_slug = ? AND subscriber_id = ?",
      )
        .bind("mixed-post", "queue-sub-2")
        .first<{ status: string }>();
      expect(okDelivery?.status).toBe("sent");

      const failDelivery = await env.DB.prepare(
        "SELECT id FROM newsletter_deliveries WHERE post_slug = ? AND subscriber_id = ?",
      )
        .bind("mixed-post", "queue-sub-1")
        .first();
      expect(failDelivery).toBeNull();
    } finally {
      env.SEND_EMAIL.send = originalSend;
    }
  });

  it("sends HTML email with escaped content and unsubscribe link", async () => {
    const sentEmails: { to: string; subject: string; html: string }[] = [];
    const originalSend = env.SEND_EMAIL.send;
    env.SEND_EMAIL.send = async (message) => {
      const to = message.to;
      const toStr = Array.isArray(to) ? (to[0] ?? "") : (to ?? "");
      const htmlRaw = (message as { html?: string | Array<{ content: string }> }).html;
      const htmlStr = Array.isArray(htmlRaw) ? (htmlRaw[0]?.content ?? "") : (htmlRaw ?? "");
      sentEmails.push({
        to: toStr,
        subject: (message as { subject?: string }).subject ?? "",
        html: htmlStr,
      });
      return { messageId: "test-id" } as import("@cloudflare/workers-types").EmailSendResult;
    };

    try {
      const batch = createMessageBatch("newsletter-send", [
        {
          id: "msg-html",
          timestamp: new Date(),
          attempts: 1,
          body: {
            postSlug: "html-test",
            postTitle: "HTML <Test>",
            postExcerpt: "Excerpt with <script>alert(1)</script>",
            subscriberId: "queue-sub-1",
            subscriberEmail: "html@example.com",
            unsubscribeToken: "unsub-html",
          },
        },
      ]);

      const ctx = createExecutionContext();
      await worker.queue(batch, env, ctx);
      await getQueueResult(batch, ctx);

      expect(sentEmails.length).toBe(1);
      expect(sentEmails[0]!.to).toBe("html@example.com");
      expect(sentEmails[0]!.subject).toBe("New Post: HTML <Test>");
      expect(sentEmails[0]!.html).toContain("html-test");
      expect(sentEmails[0]!.html).toContain("&lt;Test&gt;");
      expect(sentEmails[0]!.html).toContain("&lt;script&gt;");
      const expectedToken = await deriveUnsubscribeToken(env.NEWSLETTER_SEND_SECRET, "queue-sub-1");
      expect(sentEmails[0]!.html).toContain(expectedToken);
      expect(sentEmails[0]!.html).toContain(env.SITE_URL);
    } finally {
      env.SEND_EMAIL.send = originalSend;
    }
  });

  it("acks inactive subscriber and retries active one in same batch", async () => {
    const originalSend = env.SEND_EMAIL.send;
    env.SEND_EMAIL.send = async () => {
      throw new Error("SMTP down");
    };

    try {
      const batch = createMessageBatch("newsletter-send", [
        {
          id: "msg-inactive",
          timestamp: new Date(),
          attempts: 1,
          body: {
            postSlug: "same-batch",
            postTitle: "Same Batch",
            postExcerpt: "Excerpt",
            subscriberId: "nonexistent-sub",
            subscriberEmail: "nobody@example.com",
            unsubscribeToken: "unsub-none",
          },
        },
        {
          id: "msg-active-fail",
          timestamp: new Date(),
          attempts: 1,
          body: {
            postSlug: "same-batch",
            postTitle: "Same Batch",
            postExcerpt: "Excerpt",
            subscriberId: "queue-sub-1",
            subscriberEmail: "queue-1@example.com",
            unsubscribeToken: "unsub-q1",
          },
        },
      ]);

      const ctx = createExecutionContext();
      await worker.queue(batch, env, ctx);
      const result = await getQueueResult(batch, ctx);

      expect(result.explicitAcks).toStrictEqual(["msg-inactive"]);
      expect(result.retryMessages).toStrictEqual([{ msgId: "msg-active-fail" }]);
    } finally {
      env.SEND_EMAIL.send = originalSend;
    }
  });

  // L7: After max retries, blacklist and ack
  it("blacklists email and acks after max retries exceeded", async () => {
    const originalSend = env.SEND_EMAIL.send;
    env.SEND_EMAIL.send = async () => {
      throw new Error("Permanent SMTP failure");
    };

    try {
      const batch = createMessageBatch("newsletter-send", [
        {
          id: "msg-max-retry",
          timestamp: new Date(),
          attempts: 5,
          body: {
            postSlug: "blacklist-post",
            postTitle: "Blacklist Test",
            postExcerpt: "Excerpt",
            subscriberId: "queue-sub-1",
            subscriberEmail: "blacklist@example.com",
            unsubscribeToken: "unsub-blk",
          },
        },
      ]);

      const ctx = createExecutionContext();
      await worker.queue(batch, env, ctx);
      const result = await getQueueResult(batch, ctx);

      // Should ack (not retry) after max retries
      expect(result.explicitAcks).toStrictEqual(["msg-max-retry"]);
      expect(result.retryMessages).toStrictEqual([]);

      // Should be in blacklist
      const blacklisted = await env.DB.prepare("SELECT email FROM blacklist WHERE email = ?")
        .bind("blacklist@example.com")
        .first();
      expect(blacklisted).not.toBeNull();
    } finally {
      env.SEND_EMAIL.send = originalSend;
      await env.DB.prepare("DELETE FROM blacklist WHERE email = ?")
        .bind("blacklist@example.com")
        .run();
    }
  });
});
