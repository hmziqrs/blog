# Migrate Rate Limiting to KV, Add Queues for Newsletter, and Add Comprehensive Tests

Migrate D1-based rate limiting to Cloudflare KV with automatic TTL, replace direct batch email sending with Cloudflare Queues for reliable delivery, and add comprehensive tests for all Cloudflare services (D1, KV, Queues, SendEmail, Turnstile).

---

## Context

The `apps/api/` Hono Worker uses D1 for structured data (subscribers, newsletter tracking, media) and for rate limiting via the `rate_limits` table with manual SQL cleanup. Newsletter sending uses direct `sendMail()` calls in a `Promise.all` batch from the HTTP endpoint, which provides no retry on failure. There is no KV namespace or Queue configured. The vitest-pool-workers test suite covers basic route validation and helper functions, but does not exercise rate limiting internals, queue processing, or media pipeline workflows against simulated bindings.

## Audit Status

**As of audit date: 2026-05-01 — None of the 17 changes below have been implemented.** The codebase remains in the pre-migration state.

- `wrangler.toml` has no KV or Queue bindings.
- `src/lib/rate-limit.ts` still uses D1 SQL.
- `src/modules/newsletter/routes/send.ts` still sends directly and returns `{ sent, failed }`.
- No `src/app.ts`, no queue consumer, no `NewsletterMessage` interface.
- Tests still assert against D1 rate-limit rows and `{ sent, failed }` shapes.
- `scripts/send-newsletter.ts` still parses `{ sent, failed }`.

The sections below have been **cross-checked against latest Cloudflare and Hono documentation** and include corrected/recommended implementations.

---

## Scope

### In

- Add KV namespace binding `RATE_LIMIT_KV` and Queue `newsletter-send` to `wrangler.toml` (prod + staging)
- Rewrite `apps/api/src/lib/rate-limit.ts` from D1 to KV
- Rewrite `apps/api/src/modules/newsletter/routes/send.ts` to enqueue instead of send directly
- Create Queue consumer `apps/api/src/modules/newsletter/queue-consumer.ts`
- Create `apps/api/src/app.ts` (Hono app, importable by tests) and restructure `apps/api/src/index.ts` (Worker entry point exporting `{ fetch, queue }`)
- Update `apps/api/src/env.ts` with new binding types
- Update `apps/api/test/env.d.ts` with simulated bindings
- Add `test/rate-limit.test.ts` — KV unit tests
- Add `test/newsletter-queue.test.ts` — Queue consumer tests
- Update `test/subscribe.route.test.ts` — adapt for KV rate limiting
- Update `test/unsubscribe.route.test.ts` — adapt for KV rate limiting
- Update `test/send.route.test.ts` — adapt for Queues response shape
- ~~Add `test/media-pipeline.test.ts` — R2 + D1 integration tests~~ **(Deferred — no `media-pipeline.ts` module exists in `apps/api/src/`)**
- Update `scripts/send-newsletter.ts` to parse `{ queued }` response
- Add queue creation helper script / documentation

### Out

- Dropping the `rate_limits` table from D1 schema (deferred; leave unused table in place)
- Changing Queue architecture to a separate consumer Worker (single Worker handles both)
- Changing GitHub Action trigger (it still POSTs to `/api/newsletter/send`)

---

## Changes

### 1. `apps/api/wrangler.toml`

Add KV namespace:
```toml
[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "<KV-namespace-id>"

[[env.staging.kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "<staging-KV-namespace-id>"
```

Add Queue producer + consumer:
```toml
[[queues.producers]]
binding = "NEWSLETTER_QUEUE"
queue = "newsletter-send"

[[queues.consumers]]
queue = "newsletter-send"
max_batch_size = 10
max_batch_timeout = 30
```

Add staging equivalents.

> **Doc ref:** [KV get-started](https://developers.cloudflare.com/kv/get-started/), [Queues configuration](https://developers.cloudflare.com/queues/configuration/configure-queues/)

> **Note:** `max_batch_size` defaults to 10 and `max_batch_timeout` defaults to 5s. The spec uses `max_batch_timeout = 30` which is acceptable (max 60s). Keep it or lower to 10–15s for faster test feedback.

---

### 2. `apps/api/src/app.ts` (new)

Extract Hono app construction from current `index.ts`. Export `const app = new Hono<{ Bindings: Bindings }>()`. All route wiring stays here. Tests import from `../src/app`.

```ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Bindings } from "./env";
import newsletter from "./modules/newsletter";

const app = new Hono<{ Bindings: Bindings }>();

app.use("/api/*", async (c, next) => {
  const allowed = c.env.ALLOWED_ORIGIN;
  if (allowed) {
    return cors({
      origin: allowed,
      allowMethods: ["GET", "POST", "OPTIONS"],
    })(c, next);
  }
  return next();
});

app.route("/api/newsletter", newsletter);
app.notFound((c) => c.json({ error: "Not found" }, 404));

export default app;
```

> **Doc ref:** [Hono Cloudflare Workers guide](https://hono.dev/docs/getting-started/cloudflare-workers)

---

### 3. `apps/api/src/index.ts`

Change from `export default app` to:
```ts
import app from "./app";
import type { Bindings } from "./env";
import type { NewsletterMessage } from "./modules/newsletter/queue";
import { handleQueueBatch } from "./modules/newsletter/queue-consumer";

export default {
  fetch: app.fetch,
  async queue(batch: MessageBatch<NewsletterMessage>, env: Bindings, ctx: ExecutionContext) {
    return handleQueueBatch(batch, env, ctx);
  },
} satisfies ExportedHandler<Bindings>;
```

> **Recommendation:** Use `fetch: app.fetch` directly instead of wrapping in `async (req, env, ctx) => app.fetch(req, env, ctx)`. Hono's `fetch` signature matches the Workers `fetch` handler exactly.

> **Doc ref:** [Hono Cloudflare Workers — Using Hono with other event handlers](https://hono.dev/docs/getting-started/cloudflare-workers#using-hono-with-other-event-handlers)

> **Risk mitigation:** Verify no other files import `index.ts` directly. Only tests should switch from `../src/index` to `../src/app`.

---

### 4. `apps/api/src/env.ts`

Add to `Bindings`:
```ts
RATE_LIMIT_KV: KVNamespace;
NEWSLETTER_QUEUE: Queue<NewsletterMessage>;
```

> **Recommendation:** Define `NewsletterMessage` in a separate file (step 5) and import it here to avoid circular dependencies.

---

### 5. `apps/api/src/modules/newsletter/queue.ts` (new)

```ts
export interface NewsletterMessage {
  postSlug: string;
  postTitle: string;
  postExcerpt: string;
  subscriberId: string;
  subscriberEmail: string;
  unsubscribeToken: string;
}
```

> **Note:** With compatibility date `2025-10-11`, the default `contentType` for Queue messages is `"json"`, so this plain object serializes automatically. No explicit `contentType` needed.

> **Doc ref:** [Queues JavaScript APIs — QueuesContentType](https://developers.cloudflare.com/queues/configuration/javascript-apis/)

---

### 6. `apps/api/src/lib/rate-limit.ts`

Full rewrite to KV. Key pattern: `rl:ip:${ip}` and `rl:email:${email}`. Store JSON array of timestamps. On check: `get` → prune entries older than 1h → count remaining → if under limit, append now and `put`. No DELETE queries needed.

```ts
const WINDOW_MS = 60 * 60 * 1000;

async function checkAndRecord(
  kv: KVNamespace,
  key: string,
  limit: number,
): Promise<boolean> {
  const now = Date.now();
  const raw = await kv.get(key);
  const timestamps: number[] = raw ? JSON.parse(raw) : [];

  const pruned = timestamps.filter((t) => now - t < WINDOW_MS);

  if (pruned.length >= limit) {
    return false;
  }

  pruned.push(now);
  await kv.put(key, JSON.stringify(pruned));
  return true;
}

export async function checkSubscribeRateLimit(
  kv: KVNamespace,
  ip: string,
  email: string,
): Promise<boolean> {
  const ipOk = await checkAndRecord(kv, `rl:ip:${ip}`, 2);
  if (!ipOk) return false;

  const emailOk = await checkAndRecord(kv, `rl:email:${email}`, 2);
  if (!emailOk) return false;

  return true;
}

export async function checkUnsubscribeRateLimit(
  kv: KVNamespace,
  ip: string,
): Promise<boolean> {
  return checkAndRecord(kv, `rl:ip:${ip}`, 3);
}
```

> **Doc ref:** [KV API](https://developers.cloudflare.com/kv/api/)

> **Warning — KV eventual consistency:** This implementation is subject to read-after-write races because KV `get`/`put` are not atomic. Two concurrent requests from the same IP could both read an empty array, both append, and both succeed. For a newsletter rate limiter at low volume, this is acceptable. If stricter consistency is needed later, migrate to Durable Objects.

> **Doc ref:** [KV — How KV works (consistency)](https://developers.cloudflare.com/kv/reference/how-kv-works/)

> **Warning — KV negative lookup caching:** If a key does not exist, the "not found" response is also cached for up to 60s. This means the first write to a new IP/email may not be immediately visible in other regions. Again, acceptable for rate limiting.

---

### 7. `apps/api/src/modules/newsletter/routes/send.ts`

HTTP endpoint now:
1. Validates auth + post meta
2. Checks `newsletter_sent` for duplicates
3. Queries active subscribers from D1
4. Enqueues one `NewsletterMessage` per subscriber via `env.NEWSLETTER_QUEUE`
5. Returns `{ queued: number }`

```ts
// After validation and duplicate check...
const subscribers = await c.env.DB.prepare(
  "SELECT id, email, unsubscribe_token FROM subscribers WHERE status = 'active'",
).all<{ id: string; email: string; unsubscribe_token: string }>();

const rows = subscribers.results ?? [];

// Use sendBatch for fewer queue operations and better throughput
const messages: MessageSendRequest<NewsletterMessage>[] = rows.map((sub) => ({
  body: {
    postSlug: post.slug,
    postTitle: post.title,
    postExcerpt: post.excerpt,
    subscriberId: sub.id,
    subscriberEmail: sub.email,
    unsubscribeToken: sub.unsubscribe_token,
  },
}));

await c.env.NEWSLETTER_QUEUE.sendBatch(messages);

await c.env.DB.prepare("INSERT INTO newsletter_sent (post_slug) VALUES (?)")
  .bind(post.slug)
  .run();

return c.json({ queued: messages.length }, 200);
```

> **Recommendation:** Use `sendBatch()` instead of individual `send()` calls in a loop. A batch can contain up to 100 messages and the total array size must not exceed 256 KB. For newsletters with many subscribers, batch in chunks of 100.

> **Doc ref:** [Queues JavaScript APIs — sendBatch](https://developers.cloudflare.com/queues/configuration/javascript-apis/)

---

### 8. `apps/api/src/modules/newsletter/queue-consumer.ts` (new)

```ts
import type { MessageBatch } from "@cloudflare/workers-types";
import type { Bindings } from "../../env";
import type { NewsletterMessage } from "./queue";
import { sendMail } from "../../lib/mailer";
import { escapeHTML } from "../../lib/email";

function generateHTML(post: NewsletterMessage, siteUrl: string): string {
  const postUrl = `${siteUrl}/posts/${encodeURIComponent(post.postSlug)}`;
  const unsubscribeUrl = `${siteUrl}/newsletter/unsubscribe?token=${encodeURIComponent(post.unsubscribeToken)}`;
  const safeTitle = escapeHTML(post.postTitle);
  const safeExcerpt = escapeHTML(post.postExcerpt);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>New Post: ${safeTitle}</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
    <h2 style="color: #333; margin-top: 0;">New Post Published</h2>
    <h3 style="color: #666; margin-bottom: 10px;">${safeTitle}</h3>
    <p style="color: #555; line-height: 1.6;">${safeExcerpt}</p>
    <a href="${postUrl}" style="display: inline-block; background: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Read Full Post</a>
  </div>
  <p style="color: #999; font-size: 12px; margin-top: 30px;">
    You're receiving this because you subscribed to Hmziq's blog newsletter.
    <a href="${unsubscribeUrl}" style="color: #999;">Unsubscribe</a>
  </p>
</body>
</html>`;
}

export async function handleQueueBatch(
  batch: MessageBatch<NewsletterMessage>,
  env: Bindings,
  _ctx: ExecutionContext,
): Promise<void> {
  for (const msg of batch.messages) {
    try {
      // Verify subscriber still active
      const sub = await env.DB.prepare(
        "SELECT id FROM subscribers WHERE id = ? AND status = 'active'"
      )
        .bind(msg.body.subscriberId)
        .first<{ id: string }>();

      if (!sub) {
        msg.ack();
        continue;
      }

      // Send email
      const html = generateHTML(msg.body, env.SITE_URL);
      await sendMail(env.SEND_EMAIL, {
        from: env.EMAIL_FROM_ADDRESS,
        to: msg.body.subscriberEmail,
        subject: `New Post: ${msg.body.postTitle}`,
        html,
      });

      // Record delivery
      await env.DB.prepare(
        "INSERT OR IGNORE INTO newsletter_deliveries (post_slug, subscriber_id, status, sent_at) VALUES (?, ?, 'sent', datetime('now'))"
      )
        .bind(msg.body.postSlug, msg.body.subscriberId)
        .run();

      msg.ack();
    } catch {
      msg.retry();
    }
  }
}
```

> **Doc ref:** [Queues — Batching, Retries and Delays](https://developers.cloudflare.com/queues/configuration/batching-retries/)

> **Key behavior:** When `ack()` is called on a message and a later message in the same batch throws, the acked message is **not** retried. The first per-message call (`ack()` or `retry()`) wins over batch-level defaults.

> **Note:** `generateHTML` was previously inline in `send.ts`. It must be extracted (or duplicated) into the consumer since `send.ts` no longer sends emails directly.

---

### 9. `apps/api/src/modules/newsletter/routes/subscribe.ts`

Pass `c.env.RATE_LIMIT_KV` to `checkSubscribeRateLimit`.

```ts
const allowed = await checkSubscribeRateLimit(c.env.RATE_LIMIT_KV, ip, email);
```

---

### 10. `apps/api/src/modules/newsletter/routes/unsubscribe.ts`

Pass `c.env.RATE_LIMIT_KV` to `checkUnsubscribeRateLimit`.

```ts
const allowed = await checkUnsubscribeRateLimit(c.env.RATE_LIMIT_KV, ip);
```

---

### 11. `apps/api/test/env.d.ts`

Add to `ProvidedEnv`:
```ts
declare module "cloudflare:test" {
  interface ProvidedEnv {
    DB: D1Database;
    TEST_MIGRATIONS: import("cloudflare:test").D1Migration[];
    RATE_LIMIT_KV: KVNamespace;
    NEWSLETTER_QUEUE: Queue<import("../src/modules/newsletter/queue").NewsletterMessage>;
    TURNSTILE_SECRET_KEY: string;
    NEWSLETTER_SEND_SECRET: string;
    EMAIL_FROM_ADDRESS: string;
    ALLOWED_ORIGIN: string;
    SITE_URL: string;
    ENVIRONMENT: string;
  }
}
```

> **Doc ref:** [Test APIs — `cloudflare:workers` / `cloudflare:test`](https://developers.cloudflare.com/workers/testing/vitest-integration/test-apis/)

> **Note:** `Queue` must be typed. Use an inline `import()` type reference to avoid a real module dependency in a `.d.ts` ambient file, or import the interface at the top of the file.

---

### 12. `apps/api/test/rate-limit.test.ts` (new)

Unit tests for `checkSubscribeRateLimit` and `checkUnsubscribeRateLimit` using the simulated KV binding.

```ts
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import { checkSubscribeRateLimit, checkUnsubscribeRateLimit } from "../src/lib/rate-limit";

describe("checkSubscribeRateLimit", () => {
  it("allows first request from an IP", async () => {
    const allowed = await checkSubscribeRateLimit(env.RATE_LIMIT_KV, "10.1.1.1", "user1@example.com");
    expect(allowed).toBe(true);
  });

  it("allows second request from same IP (different email)", async () => {
    await checkSubscribeRateLimit(env.RATE_LIMIT_KV, "10.1.1.2", "user-a@example.com");
    const allowed = await checkSubscribeRateLimit(env.RATE_LIMIT_KV, "10.1.1.2", "user-b@example.com");
    expect(allowed).toBe(true);
  });

  it("blocks third request from same IP", async () => {
    await checkSubscribeRateLimit(env.RATE_LIMIT_KV, "10.1.1.3", "user-x@example.com");
    await checkSubscribeRateLimit(env.RATE_LIMIT_KV, "10.1.1.3", "user-y@example.com");
    const allowed = await checkSubscribeRateLimit(env.RATE_LIMIT_KV, "10.1.1.3", "user-z@example.com");
    expect(allowed).toBe(false);
  });

  it("allows first request for an email", async () => {
    const allowed = await checkSubscribeRateLimit(env.RATE_LIMIT_KV, "10.2.2.1", "unique@example.com");
    expect(allowed).toBe(true);
  });

  it("allows second request for same email from different IP", async () => {
    await checkSubscribeRateLimit(env.RATE_LIMIT_KV, "10.2.2.2", "same-email@example.com");
    const allowed = await checkSubscribeRateLimit(env.RATE_LIMIT_KV, "10.2.2.3", "same-email@example.com");
    expect(allowed).toBe(true);
  });

  it("blocks third request for same email", async () => {
    await checkSubscribeRateLimit(env.RATE_LIMIT_KV, "10.2.2.4", "blocked-email@example.com");
    await checkSubscribeRateLimit(env.RATE_LIMIT_KV, "10.2.2.5", "blocked-email@example.com");
    const allowed = await checkSubscribeRateLimit(env.RATE_LIMIT_KV, "10.2.2.6", "blocked-email@example.com");
    expect(allowed).toBe(false);
  });

  it("prunes timestamps older than 1 hour", async () => {
    const now = Date.now();
    const stale = [now - 3601_000];
    await env.RATE_LIMIT_KV.put("rl:ip:old-ip", JSON.stringify(stale));

    const allowed = await checkSubscribeRateLimit(env.RATE_LIMIT_KV, "old-ip", "fresh@example.com");
    expect(allowed).toBe(true);

    const remaining = await env.RATE_LIMIT_KV.get("rl:ip:old-ip");
    expect(JSON.parse(remaining!).length).toBe(1); // only the fresh entry
  });

  it("does not interfere across different IPs and emails", async () => {
    await checkSubscribeRateLimit(env.RATE_LIMIT_KV, "10.3.3.1", "a@example.com");
    await checkSubscribeRateLimit(env.RATE_LIMIT_KV, "10.3.3.2", "b@example.com");
    const allowed = await checkSubscribeRateLimit(env.RATE_LIMIT_KV, "10.3.3.3", "c@example.com");
    expect(allowed).toBe(true);
  });
});

describe("checkUnsubscribeRateLimit", () => {
  it("allows first request from an IP", async () => {
    const allowed = await checkUnsubscribeRateLimit(env.RATE_LIMIT_KV, "20.1.1.1");
    expect(allowed).toBe(true);
  });

  it("allows up to 3 requests from same IP", async () => {
    await checkUnsubscribeRateLimit(env.RATE_LIMIT_KV, "20.1.1.2");
    await checkUnsubscribeRateLimit(env.RATE_LIMIT_KV, "20.1.1.2");
    const allowed = await checkUnsubscribeRateLimit(env.RATE_LIMIT_KV, "20.1.1.2");
    expect(allowed).toBe(true);
  });

  it("blocks fourth request from same IP", async () => {
    await checkUnsubscribeRateLimit(env.RATE_LIMIT_KV, "20.1.1.3");
    await checkUnsubscribeRateLimit(env.RATE_LIMIT_KV, "20.1.1.3");
    await checkUnsubscribeRateLimit(env.RATE_LIMIT_KV, "20.1.1.3");
    const allowed = await checkUnsubscribeRateLimit(env.RATE_LIMIT_KV, "20.1.1.3");
    expect(allowed).toBe(false);
  });
});
```

> **Doc ref:** [Recipes — Tests using KV, R2 and the Cache API](https://github.com/cloudflare/workers-sdk/tree/main/fixtures/vitest-pool-workers-examples/kv-r2-caches)

> **No beforeEach/afterEach needed:** vitest-pool-workers provides per-test-file KV storage isolation, so keys written in one test file do not leak to another.

---

### 13. `apps/api/test/newsletter-queue.test.ts` (new)

Tests for `handleQueueBatch` using `createMessageBatch` and `getQueueResult` from `cloudflare:test`.

```ts
import { env, createExecutionContext, createMessageBatch, getQueueResult } from "cloudflare:test";
import { describe, expect, it, beforeAll } from "vitest";
import worker from "../src/index";

describe("handleQueueBatch", () => {
  beforeAll(async () => {
    await env.DB.prepare(
      "INSERT OR IGNORE INTO subscribers (id, email, status, unsubscribe_token) VALUES (?, ?, 'active', ?)"
    )
      .bind("queue-sub-1", "queue-1@example.com", "unsub-q1")
      .run();
  });

  it("processes message, sends email, records delivery as 'sent'", async () => {
    const batch = createMessageBatch("newsletter-send", [
      {
        id: "msg-1",
        timestamp: new Date(),
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
    expect(result.explicitAcks).toStrictEqual(["msg-1"]);
    expect(result.retryMessages).toStrictEqual([]);

    const delivery = await env.DB.prepare(
      "SELECT status FROM newsletter_deliveries WHERE post_slug = ? AND subscriber_id = ?"
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

    expect(result.explicitAcks).toStrictEqual(["msg-2"]);

    const delivery = await env.DB.prepare(
      "SELECT id FROM newsletter_deliveries WHERE post_slug = ? AND subscriber_id = ?"
    )
      .bind("queue-test-post-2", "nonexistent-sub")
      .first();

    expect(delivery).toBeNull();
  });
});
```

> **Doc ref:** [Test APIs — `createMessageBatch` / `getQueueResult`](https://developers.cloudflare.com/workers/testing/vitest-integration/test-apis/)

> **Doc ref:** [Recipes — Tests using Queue producers and consumers](https://github.com/cloudflare/workers-sdk/tree/main/fixtures/vitest-pool-workers-examples/queues)

---

### 14. `apps/api/test/media-pipeline.test.ts`

**Deferred.** No `media-pipeline.ts` module exists in `apps/api/src/`. The `media` table exists in D1 migrations, but there is no corresponding TypeScript helper module to test.

**Recommendation:** Implement `apps/api/src/lib/media-pipeline.ts` first (with `buildR2Key`, `reverseR2Key`, `rewriteImageRefs`), then add this test file.

---

### 15. Update existing route tests

#### `subscribe.route.test.ts`
- **Import change:** `import app from "../src/index"` → `import app from "../src/app"`
- **Cleanup:** Remove `await env.DB.prepare("DELETE FROM rate_limits").run()` from `afterEach`. KV state is auto-isolated per test file in vitest-pool-workers.
- **Remove test:** `"records rate-limit entries in DB"` — this test queries the `rate_limits` D1 table and is no longer relevant.
- **Rate-limit 429 tests:** Keep as-is. They should still pass because the routes will still return 429; only the backend storage changes.

#### `unsubscribe.route.test.ts`
- **Import change:** `import app from "../src/index"` → `import app from "../src/app"`
- **Cleanup:** Remove `await env.DB.prepare("DELETE FROM rate_limits").run()` from `afterEach`.

#### `send.route.test.ts`
- **Import change:** `import app from "../src/index"` → `import app from "../src/app"`
- **Assertion change:** `{ sent: number; failed: number }` → `{ queued: number }`
- **Remove synchronous delivery check:** Delete the `newsletter_deliveries` assertion from the send route test. Delivery now happens asynchronously in the queue consumer.
- **Add queue consumer test:** Use the separate `newsletter-queue.test.ts` (step 13) to verify delivery.

#### `app.test.ts`
- **Import change:** `import app from "../src/index"` → `import app from "../src/app"`

---

### 16. `scripts/send-newsletter.ts`

Update response parsing:
```ts
const result = (await response.json()) as { queued?: number; message?: string };
console.log(result.message ?? `Queued: ${result.queued ?? 0}`);
```

Remove the `if ((result.failed ?? 0) > 0) process.exit(1)` line since `failed` no longer exists in the response.

---

### 17. `package.json` helper script

Add: `"queue:create": "wrangler queues create newsletter-send"` in `apps/api/package.json`.

> **Doc ref:** [Queues get-started](https://developers.cloudflare.com/queues/get-started/)

---

## Verification

1. `bun run check-types` — tsc passes with new bindings.
2. `bun run test` (api) — all existing tests pass, new KV + Queue tests pass.
3. `curl` subscribe endpoint 3× from same IP → 429 on third attempt.
4. `curl` newsletter send → returns `{ queued: N }`.
5. Queue dashboard (Cloudflare) → messages processed successfully.
6. `bun run qa` from root — lint, fmt, typecheck, all tests pass.

---

## Risks

- **KV eventual consistency:** Brief stale reads possible; acceptable for rate limiting. Confirmed by [KV docs](https://developers.cloudflare.com/kv/reference/how-kv-works/).
- **KV race condition:** The `get` → parse → prune → `put` sequence in rate limiting is not atomic. Two concurrent requests from the same IP could both succeed. Mitigation: accept for low-volume newsletter use case; migrate to Durable Objects if strictness is required.
- **Queue free tier:** 1M ops/month. Well within limits at current scale.
- **Worker export refactor:** Tests import from `app.ts` not `index.ts`. Verify no other files import `index.ts` directly.
- **Queue testing in vitest-pool-workers:** Manual handler invocation required (no automatic message delivery in test runtime). Use `createMessageBatch` + `getQueueResult` as documented.
- **Queue message size:** Each message must be < 128 KB. Newsletter metadata is tiny; well within limit.
- **SendEmail local simulation:** In vitest-pool-workers, `SendEmail` binding simulates success. Queue consumer tests will see successful sends unless explicitly mocked.

---

## Implementation Order

To avoid circular dependencies and build errors, implement in this order:

1. Create `src/modules/newsletter/queue.ts` (`NewsletterMessage` interface).
2. Update `src/env.ts` with new bindings.
3. Rewrite `src/lib/rate-limit.ts` to KV.
4. Create `src/app.ts` (extract from `index.ts`).
5. Refactor `src/index.ts` to `{ fetch, queue }` module export.
6. Create `src/modules/newsletter/queue-consumer.ts`.
7. Update `src/modules/newsletter/routes/send.ts` to enqueue.
8. Update `src/modules/newsletter/routes/subscribe.ts` and `unsubscribe.ts` to pass KV.
9. Update `wrangler.toml` with KV + Queue bindings.
10. Update `test/env.d.ts` with simulated bindings.
11. Rewrite `test/rate-limit.test.ts` for KV.
12. Create `test/newsletter-queue.test.ts`.
13. Update existing route tests (imports, assertions, cleanup).
14. Update `scripts/send-newsletter.ts`.
15. Add `queue:create` script to `package.json`.
16. Run `bun run check-types` and `bun run test`.

---

## References

- [Cloudflare KV — How KV works](https://developers.cloudflare.com/kv/reference/how-kv-works/)
- [Cloudflare KV — Get started](https://developers.cloudflare.com/kv/get-started/)
- [Cloudflare Queues — JavaScript APIs](https://developers.cloudflare.com/queues/configuration/javascript-apis/)
- [Cloudflare Queues — Batching, Retries and Delays](https://developers.cloudflare.com/queues/configuration/batching-retries/)
- [Cloudflare Workers — Vitest integration](https://developers.cloudflare.com/workers/testing/vitest-integration/)
- [Cloudflare Workers — Test APIs](https://developers.cloudflare.com/workers/testing/vitest-integration/test-apis/)
- [Hono — Cloudflare Workers](https://hono.dev/docs/getting-started/cloudflare-workers)
- [Vitest pool workers recipes](https://github.com/cloudflare/workers-sdk/tree/main/fixtures/vitest-pool-workers-examples)
