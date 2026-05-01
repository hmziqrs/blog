import { env, createExecutionContext, createMessageBatch, getQueueResult } from "cloudflare:test";
import { describe, expect, it, beforeAll, afterEach } from "vitest";
import app from "../src/app";
import worker from "../src/index";
import type { NewsletterMessage } from "../src/modules/newsletter/queue";
import type { MessageSendRequest } from "@cloudflare/workers-types";
import { deriveUnsubscribeToken } from "../src/lib/tokens";

const ctx = createExecutionContext();
type NewsletterQueueMessage = MessageSendRequest<NewsletterMessage>;

describe("Newsletter end-to-end", () => {
  beforeAll(async () => {
    await env.DB.prepare(
      "INSERT OR IGNORE INTO subscribers (id, email, status, unsubscribe_token_hash) VALUES (?, ?, 'active', ?)",
    )
      .bind("e2e-sub", "e2e@example.com", "hash-e2e")
      .run();
  });

  afterEach(async () => {
    await env.DB.prepare("DELETE FROM newsletter_sent").run();
    await env.DB.prepare("DELETE FROM newsletter_deliveries").run();
  });

  it("send endpoint enqueues and queue consumer records delivery", async () => {
    const capturedBatch: { body: NewsletterMessage }[] = [];
    const originalSendBatch = env.NEWSLETTER_QUEUE.sendBatch.bind(env.NEWSLETTER_QUEUE);
    env.NEWSLETTER_QUEUE.sendBatch = async (messages: { body: NewsletterMessage }[]) => {
      capturedBatch.push(...messages);
    };

    try {
      // Step 1: Call send endpoint
      const sendRes = await app.fetch(
        new Request("http://localhost/api/newsletter/send", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-send-secret": "local-dev-secret",
          },
          body: JSON.stringify({
            slug: "e2e-post",
            subject: "E2E Test Post",
            htmlBody: "<p>End-to-end newsletter flow</p>",
          }),
        }),
        env,
        ctx,
      );
      expect(sendRes.status).toBe(200);
      const sendBody = (await sendRes.json()) as { queued: number };
      expect(sendBody.queued).toBe(1);

      // Step 2: Verify a message was enqueued with correct shape
      expect(capturedBatch.length).toBe(1);
      const msg = capturedBatch[0]!.body;
      expect(msg.issueSlug).toBe("e2e-post");
      expect(msg.subject).toBe("E2E Test Post");
      expect(msg.htmlBody).toBe("<p>End-to-end newsletter flow</p>");
      expect(msg.subscriberId).toBe("e2e-sub");
      expect(msg.subscriberEmail).toBe("e2e@example.com");
      const expectedToken = await deriveUnsubscribeToken(env.NEWSLETTER_SEND_SECRET, "e2e-sub");
      expect(msg.unsubscribeToken).toBe(expectedToken);

      // Step 3: Feed captured message into queue consumer
      const queueBatch = createMessageBatch("newsletter-send", [
        {
          id: "e2e-msg",
          timestamp: new Date(),
          attempts: 1,
          body: msg,
        },
      ]);

      const queueCtx = createExecutionContext();
      await worker.queue(queueBatch, env, queueCtx);
      const result = await getQueueResult(queueBatch, queueCtx);

      expect(result.explicitAcks).toStrictEqual(["e2e-msg"]);
      expect(result.retryMessages).toStrictEqual([]);

      // Step 4: Verify delivery recorded in D1
      const delivery = await env.DB.prepare(
        "SELECT status FROM newsletter_deliveries WHERE issue_slug = ? AND subscriber_id = ?",
      )
        .bind("e2e-post", "e2e-sub")
        .first<{ status: string }>();

      expect(delivery).not.toBeNull();
      expect(delivery?.status).toBe("sent");
    } finally {
      env.NEWSLETTER_QUEUE.sendBatch = originalSendBatch;
    }
  });

  it("send endpoint does not enqueue duplicate for already-sent issue", async () => {
    await env.DB.prepare("INSERT INTO newsletter_sent (issue_slug) VALUES (?)")
      .bind("dup-post")
      .run();

    const batchCalls: NewsletterQueueMessage[][] = [];
    const originalSendBatch = env.NEWSLETTER_QUEUE.sendBatch.bind(env.NEWSLETTER_QUEUE);
    env.NEWSLETTER_QUEUE.sendBatch = async (messages: Iterable<NewsletterQueueMessage>) => {
      batchCalls.push([...messages]);
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
            slug: "dup-post",
            subject: "Duplicate",
            htmlBody: "<p>Should not enqueue</p>",
          }),
        }),
        env,
        ctx,
      );
      expect(sendRes.status).toBe(200);
      const body = (await sendRes.json()) as { message?: string; queued?: number };
      expect(body.message).toBe("Already sent");

      // Queue should not have been touched
      expect(batchCalls.length).toBe(0);
    } finally {
      env.NEWSLETTER_QUEUE.sendBatch = originalSendBatch;
    }
  });
});
