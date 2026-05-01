# Cloudflare Integration Security Audit

Scope: `apps/api/` (Worker, routes, queue, rate limiter), `apps/web/` newsletter UI, `wrangler.toml`, D1 schema, CI workflows.

## High

### H1. GET unsubscribe → silent unsubscribes by link scanners

File: `apps/api/src/modules/newsletter/routes/unsubscribe.ts:31-47`
Mail security gateways (Microsoft Safe Links, Mimecast, Proofpoint, Gmail previews, AVs) auto-fetch every URL in delivered email. Each scan deletes the subscriber. Tokens also leak into history, Referer, proxy logs.
Fix: remove the GET handler; require POST. Use RFC 8058 `List-Unsubscribe-Post: List-Unsubscribe=One-Click` for inbox-native unsubscribe.

### H2. `/send` accepts arbitrary slug + race on duplicate sends

File: `apps/api/src/modules/newsletter/routes/send.ts:24-71`

- No verification that `slug` corresponds to an actual published post. If `NEWSLETTER_SEND_SECRET` leaks, attacker mails arbitrary content to the entire list from `EMAIL_FROM_ADDRESS`.
- `alreadySent` check (L39) and `INSERT INTO newsletter_sent` (L67) bracket the enqueue. Two concurrent calls both pass the check, both `sendBatch`, then one INSERT loses on the unique constraint. Subscribers receive the newsletter twice.
- The same SELECT-then-INSERT pattern in `subscribe.ts:56-71` throws a raw 500 on the `email UNIQUE` constraint when two concurrent subscribes hit the same address. Correctness bug, same fix.
  Fix: `INSERT … ON CONFLICT DO NOTHING` first; only enqueue / proceed if `meta.changes === 1`. Validate slug exists in the content collection.

### H3. Non-constant-time secret comparison

File: `apps/api/src/modules/newsletter/routes/send.ts:14-17`
`secret !== c.env.NEWSLETTER_SEND_SECRET` short-circuits per byte.
Fix: byte-length-equal compare via `crypto.subtle` or manual constant-time XOR.

## Medium

### M1. Email enumeration on `/subscribe`

File: `apps/api/src/modules/newsletter/routes/subscribe.ts:55-58`
Returning `409 "Already subscribed"` vs `201` lets anyone confirm whether an address is on the list.
Fix: always return `201` for valid input. The DB unique constraint already deduplicates.

### M2. KV rate limiter is racy

File: `apps/api/src/lib/rate-limit.ts:6-29`
Read-modify-write on KV is non-atomic and eventually consistent (~60s). N concurrent requests all read the same pre-burst array; the `limit=2` cap is bypassed by a burst.
Fix: use a Durable Object counter, or the Cloudflare Rate Limiting binding (atomic).

### M3. `*.workers.dev` URL not disabled

File: `apps/api/wrangler.toml`
Default-on `*.workers.dev` bypasses zone WAF / Bot Management attached to `blog.hmziq.rs`.
Fix: set `workers_dev = false` in top-level and `[env.staging]`.

### M4. Production CORS effectively absent

File: `apps/api/src/app.ts:8-15`
With `ALLOWED_ORIGIN=""` the `cors()` middleware is skipped, so no ACAO header is set. Safe today because JSON content-type forces preflight, but a future `ALLOWED_ORIGIN="*"` for debugging would expose responses cross-origin.
Fix: set `ALLOWED_ORIGIN="https://blog.hmziq.rs"` explicitly. Never accept `*`.

### M5. No runtime guard on `TURNSTILE_SECRET_KEY`

File: `apps/api/src/modules/newsletter/routes/subscribe.ts:41-50`
If the secret is left as Cloudflare's always-pass test key (`1x0000000000000000000000000000000AA`, `2x...`, `3x...`) every CAPTCHA passes and the only bot defense is the rate limiter (which is itself racy — see M2). Operator misconfig fail-open.
Fix: at app startup or first request, assert `TURNSTILE_SECRET_KEY` is non-empty and not in the documented test-key set; refuse to serve `/subscribe` otherwise.

### M6. Hard-delete on unsubscribe — no audit, blacklist unused

File: `apps/api/src/modules/newsletter/routes/unsubscribe.ts:25`
`DELETE FROM subscribers WHERE id = ?` removes the row entirely. Three consequences: no audit trail of who unsubscribed when; the `blacklist` table from `0001_initial.sql` is never populated so the same address can be re-added on a whim; old emails' unsubscribe links 404 after a re-subscribe (new token issued).
Fix: `UPDATE subscribers SET status='unsubscribed', unsubscribed_at=datetime('now') WHERE id = ?`. Filter active sends by `status='active'` (already done). Populate `blacklist` on hard bounces from the queue consumer.

## Low

### L1. PII in error logs

Files: `subscribe.ts:80`, `send.ts:73`
`console.error("…", error)` may include email/body when D1 or JSON parsing throws.
Fix: log error codes only; never the request body.

### L2. `submitTime` is client-controlled

File: `subscribe.ts:34`
Bot sets `submitTime = Date.now() - 10000` to bypass the 3s gate.
Fix: drop the check, or sign a server-issued timestamp into the form (HMAC challenge).

### L3. Honeypot dead branch

File: `subscribe.ts`
Schema `honeypot: z.string().max(0).optional()` → non-empty values fail Zod with 400 before reaching the silent-201 branch on L27. The "fake success" is unreachable.
Fix: drop `max(0)` (so bots get the fake 201 as intended), or delete the branch.

### L4. `Content-Type` substring check

Files: `subscribe.ts:18`, `unsubscribe.ts:53`
`.includes("application/json")` accepts `application/json-pretend`.
Fix: `header.split(";")[0].trim() === "application/json"`.

### L5. `CF-Connecting-IP` fallback to `"unknown"`

Files: `subscribe.ts:23`, `unsubscribe.ts:32,57`
Missing header → all callers share one rate-limit bucket. A single bad actor denies service to all.
Fix: reject the request when the header is absent in production (`ENVIRONMENT==="production"`).

### L6. Unsubscribe tokens stored plaintext

File: `apps/api/migrations/0001_initial.sql`
Anyone with DB read access (leaked CF API token, broad `db:query` use) can unsubscribe any user.
Fix: store SHA-256 hash; lookup by hash.

### L7. Queue consumer retries forever, no DLQ

File: `apps/api/src/modules/newsletter/queue-consumer.ts:48-58`, `wrangler.toml`
`catch { msg.retry() }` with no `dead_letter_queue` configured. Permanent failures (rejected addresses) silently churn until max retries, then drop with no signal.
Fix: configure `dead_letter_queue = "newsletter-dlq"` and log failure cause before retry.

### L8. Failed Turnstile still burns rate-limit budget

File: `apps/api/src/modules/newsletter/routes/subscribe.ts:36-50`
Rate limit consumed before `siteverify`. A botnet with junk tokens can exhaust a victim's per-email budget (denying their legit subscribe).
Fix: consume rate limit only after Turnstile passes, or use a separate, looser pre-Turnstile bucket.

### L9. Missing `X-Content-Type-Options: nosniff` on API responses

File: `apps/api/src/app.ts`
JSON responses don't set `X-Content-Type-Options`. Cheap defense against MIME-sniffing edge cases.
Fix: add a one-line middleware: `app.use("*", async (c, next) => { await next(); c.header("X-Content-Type-Options", "nosniff"); });`

## Verified safe

- D1 queries fully parameterized.
- `escapeHTML` covers `& < > " '`.
- `encodeURIComponent` used for `postSlug` and `unsubscribeToken` in email URLs.
- `apps/web/` is static — no server runtime.
- `TURNSTILE_SECRET_KEY` only used server-side in `siteverify`.

## Test plan

Each fix lands in the same PR as its test. Existing infra: `vitest`, `apps/api/test/apply-migrations.ts` for D1, `*.route.test.ts` for HTTP, `newsletter.test.ts` for unit.

### New tests

| ID  | Test file                                              | Case                                                                       | Pass criteria                                                                                       |
| --- | ------------------------------------------------------ | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| H1  | `unsubscribe.route.test.ts`                            | `GET /api/newsletter/unsubscribe?token=…`                                  | Returns 405; row unchanged                                                                          |
| H1  | `unsubscribe.route.test.ts`                            | `POST` with valid token                                                    | Returns 200; row soft-deleted (see M6)                                                              |
| H2a | `send.route.test.ts`                                   | Two concurrent `POST /send` same slug                                      | Exactly one `sendBatch` call; one 200 enqueued, one 200 "already sent"; `newsletter_sent` has 1 row |
| H2b | `send.route.test.ts`                                   | `POST /send` with slug not in content collection                           | Returns 400; queue not called                                                                       |
| H2c | `subscribe.route.test.ts`                              | Two concurrent `POST /subscribe` same email                                | One 201, one 201 (per M1); `subscribers` has 1 row; no 500                                          |
| H3  | `send.route.test.ts`                                   | Wrong secret of equal length to env value                                  | Returns 401                                                                                         |
| H3  | unit (`newsletter.test.ts`)                            | `timingSafeEqual` helper                                                   | Equal strings → true; unequal-same-length → false; unequal-length → false                           |
| M1  | `subscribe.route.test.ts`                              | `POST /subscribe` for already-active email                                 | Returns 201 (not 409); no duplicate row inserted                                                    |
| M5  | `app.test.ts`                                          | App init with `TURNSTILE_SECRET_KEY=""`                                    | `POST /subscribe` returns 503 with config error                                                     |
| M5  | `app.test.ts`                                          | App init with `TURNSTILE_SECRET_KEY="1x0000000000000000000000000000000AA"` | `POST /subscribe` returns 503                                                                       |
| M6  | `unsubscribe.route.test.ts`                            | After unsubscribe                                                          | Row exists with `status='unsubscribed'`; `unsubscribed_at` set                                      |
| M6  | `send.route.test.ts`                                   | `/send` with unsubscribed row present                                      | Unsubscribed email not enqueued                                                                     |
| M6  | `subscribe.route.test.ts`                              | Re-subscribe after unsubscribe                                             | Row updated to `status='active'`; behavior pinned (reuse vs rotate token — pick one)                |
| L4  | `subscribe.route.test.ts`, `unsubscribe.route.test.ts` | `Content-Type: application/json-pretend`                                   | Returns 415                                                                                         |
| L5  | `subscribe.route.test.ts`                              | Missing `CF-Connecting-IP` with `ENVIRONMENT=production`                   | Returns 400                                                                                         |
| L9  | `app.test.ts`                                          | Any `/api/*` response                                                      | Header `X-Content-Type-Options: nosniff` present                                                    |

### Tests to update

- `subscribe.route.test.ts` — assertion "already subscribed → 409" flips to "→ 201" (M1).
- `unsubscribe.route.test.ts` — assertions checking row is `DELETE`d flip to `status='unsubscribed'` (M6).
- `rate-limit.test.ts` — replaced wholesale when M2 swaps the JSON-array impl for DO / RL binding.

### Out of scope for unit tests

- **M2 KV race** — non-deterministic on current impl; covered by replacing the impl, not by a flaky test.
- **M3 `workers_dev = false`** — config assertion; pin via a one-line check in `app.test.ts` that parses `wrangler.toml` if desired.
- **H3 timing measurement** — flaky in V8 isolates; cover by unit-testing the wrapper, not the timing.

### Definition of done per fix

1. Code change merged.
2. Test from the table above added (or existing test updated).
3. `bun run test` green.
4. Audit doc entry annotated with `// fixed in <commit>` or removed.
