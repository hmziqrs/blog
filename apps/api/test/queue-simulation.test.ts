import { env, createExecutionContext, createMessageBatch, getQueueResult } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import worker from "../src/index";
import type { NewsletterMessage } from "../src/modules/newsletter/queue";

describe("Queue simulation behavior in test environment", () => {
  it("sendBatch on simulated Queue does not throw and stores messages", async () => {
    const msg: NewsletterMessage = {
      postSlug: "sim-test",
      postTitle: "Simulated Queue Test",
      postExcerpt: "Testing queue producer simulation",
      subscriberId: "sub-1",
      subscriberEmail: "sim@example.com",
      unsubscribeToken: "unsub-sim",
    };

    // This works in the simulated environment just like KV.put or D1.prepare
    await expect(env.NEWSLETTER_QUEUE.sendBatch([{ body: msg }])).resolves.not.toThrow();
  });

  it("Queue consumer is NOT auto-invoked — must call worker.queue manually", async () => {
    const msg: NewsletterMessage = {
      postSlug: "manual-test",
      postTitle: "Manual Consumer Test",
      postExcerpt: "Consumers must be invoked manually in tests",
      subscriberId: "sub-2",
      subscriberEmail: "manual@example.com",
      unsubscribeToken: "unsub-manual",
    };

    // Producer side: enqueue works
    await env.NEWSLETTER_QUEUE.sendBatch([{ body: msg }]);

    // Consumer side: unlike D1 where queries execute immediately,
    // Queue consumers are event-driven and must be invoked manually in tests.
    // We use createMessageBatch + getQueueResult to simulate delivery.
    const batch = createMessageBatch("newsletter-send", [
      {
        id: "manual-msg",
        timestamp: new Date(),
        attempts: 1,
        body: msg,
      },
    ]);

    const ctx = createExecutionContext();
    await worker.queue(batch, env, ctx);
    const result = await getQueueResult(batch, ctx);

    expect(result.explicitAcks).toContain("manual-msg");
  });

  it("KV and D1 execute immediately; Queue consumers require manual invocation", async () => {
    // D1: query executes immediately
    await env.DB.prepare(
      "INSERT INTO subscribers (id, email, status, unsubscribe_token) VALUES (?, ?, 'active', ?)",
    )
      .bind("kv-d1-sub", "kv-d1@example.com", "unsub-kv-d1")
      .run();

    const row = await env.DB.prepare("SELECT id FROM subscribers WHERE id = ?")
      .bind("kv-d1-sub")
      .first();
    expect(row).not.toBeNull(); // D1 is synchronous

    // KV: put/get execute immediately
    await env.RATE_LIMIT_KV.put("test:key", "value");
    const value = await env.RATE_LIMIT_KV.get("test:key");
    expect(value).toBe("value"); // KV is synchronous in tests

    // Queue producer: sendBatch executes immediately (stores in memory)
    await env.NEWSLETTER_QUEUE.sendBatch([
      {
        body: {
          postSlug: "kv-d1-q",
          postTitle: "Comparison",
          postExcerpt: "Excerpt",
          subscriberId: "kv-d1-sub",
          subscriberEmail: "kv-d1@example.com",
          unsubscribeToken: "unsub-kv-d1",
        },
      },
    ]);

    // But the consumer handler is NOT automatically called.
    // No delivery record exists until we manually invoke worker.queue.
    const delivery = await env.DB.prepare(
      "SELECT id FROM newsletter_deliveries WHERE post_slug = ?",
    )
      .bind("kv-d1-q")
      .first();
    expect(delivery).toBeNull(); // consumer was not auto-invoked
  });
});
