import { env, createExecutionContext, createMessageBatch, getQueueResult } from "cloudflare:test";
import { describe, expect, it, afterEach, beforeEach } from "vitest";
import app from "../src/app";
import worker from "../src/index";
import type { NewsletterMessage } from "../src/modules/newsletter/queue";
import { deriveUnsubscribeToken, hashToken } from "../src/lib/tokens";

const ctx = createExecutionContext();

const FAKE_TURNSTILE_SECRET = "0x4AAAAAAAfakeSecretKeyForTesting";
let originalFetch: typeof fetch;
let originalEnvironment: string;
let originalTurnstile: string;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    if (url.includes("challenges.cloudflare.com/turnstile")) {
      return new Response(JSON.stringify({ success: true }), {
        headers: { "content-type": "application/json" },
      });
    }
    return originalFetch(input, init);
  }) as typeof fetch;

  originalTurnstile = env.TURNSTILE_SECRET_KEY;
  env.TURNSTILE_SECRET_KEY = FAKE_TURNSTILE_SECRET;
  originalEnvironment = env.ENVIRONMENT;
  env.ENVIRONMENT = "test";
});

describe("Complete end-to-end newsletter flow", () => {
  afterEach(async () => {
    globalThis.fetch = originalFetch;
    env.TURNSTILE_SECRET_KEY = originalTurnstile;
    env.ENVIRONMENT = originalEnvironment;
    await env.DB.prepare("DELETE FROM newsletter_deliveries WHERE issue_slug = ?")
      .bind("e2e-flow-post")
      .run();
    await env.DB.prepare("DELETE FROM newsletter_deliveries WHERE issue_slug = ?")
      .bind("unsub-test-post")
      .run();
    await env.DB.prepare("DELETE FROM newsletter_sent WHERE issue_slug = ?")
      .bind("e2e-flow-post")
      .run();
    await env.DB.prepare("DELETE FROM newsletter_sent WHERE issue_slug = ?")
      .bind("unsub-test-post")
      .run();
    await env.DB.prepare("DELETE FROM subscribers WHERE email = ?")
      .bind("e2e-new@example.com")
      .run();
    await env.DB.prepare("DELETE FROM subscribers WHERE email LIKE 'e2e-%@example.com'").run();
    // Clear KV rate-limit keys from previous test runs
    const rlKeys = ["99.99.99.99", "100.100.100.100"];
    for (const ip of rlKeys) {
      await env.RATE_LIMIT_KV.delete(`rl:ip:${ip}`);
    }
    await env.RATE_LIMIT_KV.delete("rl:email:e2e-rl1@example.com");
    await env.RATE_LIMIT_KV.delete("rl:email:e2e-rl2@example.com");
    await env.RATE_LIMIT_KV.delete("rl:email:e2e-rl3@example.com");
  });

  it("subscribe -> send -> queue -> consumer -> email -> delivery record", async () => {
    const subscribeRes = await app.fetch(
      new Request("http://localhost/api/newsletter/subscribe", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "CF-Connecting-IP": "192.168.1.1",
        },
        body: JSON.stringify({
          email: "e2e-new@example.com",
          token: "dummy-token",
        }),
      }),
      env,
      ctx,
    );
    expect(subscribeRes.status).toBe(201);
    const subscribeBody = (await subscribeRes.json()) as { message: string };
    expect(subscribeBody.message).toBe("Subscribed");

    const subscriber = await env.DB.prepare(
      "SELECT id, email FROM subscribers WHERE email = ? AND status = 'active'",
    )
      .bind("e2e-new@example.com")
      .first<{ id: string; email: string }>();
    expect(subscriber).not.toBeNull();
    const subscriberId = subscriber!.id;
    const unsubscribeToken = await deriveUnsubscribeToken(env.NEWSLETTER_SEND_SECRET, subscriberId);

    const capturedMessages: NewsletterMessage[] = [];
    const originalSendBatch = env.NEWSLETTER_QUEUE.sendBatch.bind(env.NEWSLETTER_QUEUE);
    env.NEWSLETTER_QUEUE.sendBatch = async (messages: { body: NewsletterMessage }[]) => {
      for (const m of messages) capturedMessages.push(m.body);
    };

    const sendRes = await (async () => {
      try {
        return await app.fetch(
          new Request("http://localhost/api/newsletter/send", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-send-secret": "local-dev-secret",
            },
            body: JSON.stringify({
              slug: "e2e-flow-post",
              subject: "E2E Flow Post",
              htmlBody: "<p>This is the complete flow test</p>",
            }),
          }),
          env,
          ctx,
        );
      } finally {
        env.NEWSLETTER_QUEUE.sendBatch = originalSendBatch;
      }
    })();

    expect(sendRes.status).toBe(200);
    const sendBody = (await sendRes.json()) as { queued: number };
    expect(sendBody.queued).toBe(1);

    expect(capturedMessages.length).toBe(1);
    const msg = capturedMessages[0]!;
    expect(msg.issueSlug).toBe("e2e-flow-post");
    expect(msg.subject).toBe("E2E Flow Post");
    expect(msg.htmlBody).toBe("<p>This is the complete flow test</p>");
    expect(msg.subscriberId).toBe(subscriberId);
    expect(msg.subscriberEmail).toBe("e2e-new@example.com");
    expect(msg.unsubscribeToken).toBe(unsubscribeToken);

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

      expect(sentEmails.length).toBe(1);
      expect(sentEmails[0]!.to).toBe("e2e-new@example.com");
      expect(sentEmails[0]!.subject).toBe("E2E Flow Post");
      expect(sentEmails[0]!.html).toContain("<p>This is the complete flow test</p>");
      expect(sentEmails[0]!.html).toContain(unsubscribeToken);

      const delivery = await env.DB.prepare(
        "SELECT status, subscriber_id FROM newsletter_deliveries WHERE issue_slug = ? AND subscriber_id = ?",
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

  it("unsubscribe soft-deletes subscriber and they no longer receive emails", async () => {
    const token = await deriveUnsubscribeToken(env.NEWSLETTER_SEND_SECRET, "e2e-unsub");
    const tokenHash = await hashToken(token);
    await env.DB.prepare(
      "INSERT INTO subscribers (id, email, status, unsubscribe_token_hash) VALUES (?, ?, 'active', ?)",
    )
      .bind("e2e-unsub", "e2e-unsub@example.com", tokenHash)
      .run();

    const unsubRes = await app.fetch(
      new Request("http://localhost/api/newsletter/unsubscribe", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "CF-Connecting-IP": "10.0.0.1",
        },
        body: JSON.stringify({ token }),
      }),
      env,
      ctx,
    );
    expect(unsubRes.status).toBe(200);

    // M6: soft-delete — row still exists with status='unsubscribed'
    const row = await env.DB.prepare("SELECT id, status FROM subscribers WHERE id = ?")
      .bind("e2e-unsub")
      .first<{ id: string; status: string }>();
    expect(row).not.toBeNull();
    expect(row?.status).toBe("unsubscribed");

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
            subject: "After Unsubscribe",
            htmlBody: "<p>Should not reach unsubscribed user</p>",
          }),
        }),
        env,
        ctx,
      );
      expect(sendRes.status).toBe(200);

      const forUnsubUser = capturedMessages.filter((m) => m.subscriberId === "e2e-unsub");
      expect(forUnsubUser.length).toBe(0);
    } finally {
      env.NEWSLETTER_QUEUE.sendBatch = originalSendBatch;
      await env.DB.prepare("DELETE FROM newsletter_sent WHERE issue_slug = ?")
        .bind("unsub-test-post")
        .run();
    }
  });

  it("rate-limited IP cannot subscribe, but other IPs can", async () => {
    const blockedIp = "99.99.99.99";

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
