# Migrate Rate Limiting to KV, Add Queues for Newsletter, and Add Comprehensive Tests

Migrate D1-based rate limiting to Cloudflare KV with automatic TTL, replace direct batch email sending with Cloudflare Queues for reliable delivery, and add comprehensive tests for all Cloudflare services (D1, KV, Queues, SendEmail, Turnstile).

---

## Context

The `apps/api/` Hono Worker uses D1 for structured data (subscribers, newsletter tracking, media) and for rate limiting via the `rate_limits` table with manual SQL cleanup. Newsletter sending uses direct `sendMail()` calls in a `Promise.all` batch from the HTTP endpoint, which provides no retry on failure. There is no KV namespace or Queue configured. The vitest-pool-workers test suite covers basic route validation and helper functions, but does not exercise rate limiting internals, queue processing, or media pipeline workflows against simulated bindings.

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
- Add `test/media-pipeline.test.ts` — R2 + D1 integration tests
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

### 2. `apps/api/src/app.ts` (new)

Extract Hono app construction from current `index.ts`. Export `const app = new Hono<{ Bindings: Bindings }>()`. All route wiring stays here. Tests import from `../src/app`.

### 3. `apps/api/src/index.ts`

Change from `export default app` to:
```ts
export default {
  async fetch(request: Request, env: Bindings, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx);
  },
  async queue(batch: MessageBatch<NewsletterMessage>, env: Bindings, ctx: ExecutionContext) {
    return handleQueueBatch(batch, env, ctx);
  },
};
```

### 4. `apps/api/src/env.ts`

Add to `Bindings`:
```ts
RATE_LIMIT_KV: KVNamespace;
NEWSLETTER_QUEUE: Queue<NewsletterMessage>;
```

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

### 6. `apps/api/src/lib/rate-limit.ts`

Full rewrite to KV. Key pattern: `rl:ip:${ip}` and `rl:email:${email}`. Store JSON array of timestamps. On check: `get` → prune entries older than 1h → count remaining → if under limit, append now and `put`. No DELETE queries needed.

### 7. `apps/api/src/modules/newsletter/routes/send.ts`

HTTP endpoint now:
1. Validates auth + post meta
2. Checks `newsletter_sent` for duplicates
3. Queries active subscribers from D1
4. Enqueues one `NewsletterMessage` per subscriber via `env.NEWSLETTER_QUEUE`
5. Returns `{ queued: number }`

### 8. `apps/api/src/modules/newsletter/queue-consumer.ts` (new)

```ts
export async function handleQueueBatch(
  batch: MessageBatch<NewsletterMessage>,
  env: Bindings,
  ctx: ExecutionContext,
): Promise<void> {
  for (const msg of batch.messages) {
    try {
      // Verify subscriber still active
      const sub = await env.DB.prepare("SELECT id FROM subscribers WHERE id = ? AND status = 'active'")
        .bind(msg.body.subscriberId)
        .first<{ id: string }>();
      if (!sub) { msg.ack(); continue; }

      // Send email
      const html = generateHTML(msg.body, env.SITE_URL);
      await sendMail(env.SEND_EMAIL, { from: env.EMAIL_FROM_ADDRESS, to: msg.body.subscriberEmail, subject: `New Post: ${msg.body.postTitle}`, html });

      // Record delivery
      await env.DB.prepare("INSERT OR IGNORE INTO newsletter_deliveries (post_slug, subscriber_id, status, sent_at) VALUES (?, ?, 'sent', datetime('now'))")
        .bind(msg.body.postSlug, msg.body.subscriberId).run();

      msg.ack();
    } catch {
      msg.retry();
    }
  }
}
```

### 9. `apps/api/src/modules/newsletter/routes/subscribe.ts`

Pass `c.env.RATE_LIMIT_KV` to `checkSubscribeRateLimit`.

### 10. `apps/api/src/modules/newsletter/routes/unsubscribe.ts`

Pass `c.env.RATE_LIMIT_KV` to `checkUnsubscribeRateLimit`.

### 11. `apps/api/test/env.d.ts`

Add to `ProvidedEnv`:
```ts
RATE_LIMIT_KV: KVNamespace;
NEWSLETTER_QUEUE: Queue<NewsletterMessage>;
```

### 12. `apps/api/test/rate-limit.test.ts` (new)

Unit tests for `checkSubscribeRateLimit` and `checkUnsubscribeRateLimit`:
- IP under limit → true
- IP over limit → false
- Email under limit → true
- Email over limit → false
- Timestamp pruning works (entries > 1h removed)
- Different IPs/emails don't interfere

### 13. `apps/api/test/newsletter-queue.test.ts` (new)

Tests for `handleQueueBatch`:
- Processes message, sends email (mock), records delivery as 'sent'
- Subscriber no longer active → ack, no delivery record
- Send failure → retry (message not acked)
- Batch of multiple messages processed correctly

### 14. `apps/api/test/media-pipeline.test.ts` (new)

Tests for `media-pipeline.ts` helpers:
- `buildR2Key` generates correct key with hash
- `reverseR2Key` round-trips correctly
- `rewriteImageRefs` replaces cover and body image paths
- Basename collision detection

### 15. Update existing route tests

- `subscribe.route.test.ts`: Remove `DELETE FROM rate_limits` cleanup; remove direct rate limit DB query test; ensure KV rate limit 429 tests still pass (KV state should auto-isolate per test file in miniflare)
- `unsubscribe.route.test.ts`: Same cleanup changes
- `send.route.test.ts`: Change assertion from `{ sent, failed }` to `{ queued }`; remove synchronous delivery check; add separate queue consumer test for delivery verification

### 16. `scripts/send-newsletter.ts`

Update response parsing:
```ts
const result = (await response.json()) as { queued?: number; message?: string };
console.log(result.message ?? `Queued: ${result.queued ?? 0}`);
```

### 17. `package.json` helper script

Add: `"queue:create": "wrangler queues create newsletter-send"` in `apps/api/package.json`.

---

## Verification

1. `bun run check-types` — tsc passes with new bindings.
2. `bun run test` (api) — all existing tests pass, new KV + Queue + media tests pass.
3. `curl` subscribe endpoint 3× from same IP → 429 on third attempt.
4. `curl` newsletter send → returns `{ queued: N }`.
5. Queue dashboard (Cloudflare) → messages processed successfully.
6. `bun run qa` from root — lint, fmt, typecheck, all tests pass.

---

## Risks

- **KV eventual consistency**: Brief stale reads possible; acceptable for rate limiting.
- **Queue free tier**: 1M ops/month. Well within limits at current scale.
- **Worker export refactor**: Tests import from `app.ts` not `index.ts`. Verify no other files import `index.ts` directly.
- **Queue testing in vitest-pool-workers**: Manual handler invocation required (no automatic message delivery in test runtime).
