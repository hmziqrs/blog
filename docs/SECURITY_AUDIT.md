# Cloudflare Integration Security Audit

> **Status:** This audit was conducted before the KV/Queue migration. Many issues have since been fixed in the codebase. Items marked with ✅ are resolved; items marked with ⚠️ remain open. Do not treat this document as a list of active vulnerabilities without checking the current code.

Scope: `apps/api/` (Worker, routes, queue, rate limiter), `apps/web/` newsletter UI, `wrangler.toml`, D1 schema, CI workflows.

## High

### ✅ H1. GET unsubscribe → silent unsubscribes by link scanners

**Fixed.** The GET handler has been removed. Unsubscribe now requires POST only. Tokens are no longer exposed via query parameters in mail-scanner fetches.

*Original finding:* Mail security gateways auto-fetch every URL in delivered email, deleting the subscriber. Tokens leak into history, Referer, proxy logs.
*Fix applied:* Require POST for unsubscribe.

### ⚠️ H2. `/send` accepts arbitrary slug + race on duplicate sends

**Partially fixed.** The race condition is resolved: `send.ts` now uses `INSERT INTO newsletter_sent … ON CONFLICT DO NOTHING` first, and only enqueues if `meta.changes === 1`. However, **slug validation against the content collection is still not implemented** — the endpoint trusts the caller to provide a valid slug.

*Race fix applied:* `INSERT … ON CONFLICT DO NOTHING` first; proceed only if the row was newly inserted.
*Still open:* Verify `slug` exists in the content collection before enqueuing.

### ✅ H3. Non-constant-time secret comparison

**Fixed.** `send.ts` now uses a manual `timingSafeEqual` helper that compares encoded strings in constant time via XOR.

*Original finding:* `secret !== c.env.NEWSLETTER_SEND_SECRET` short-circuited per byte.
*Fix applied:* Byte-length-equal compare via constant-time XOR loop.

## Medium

### ✅ M1. Email enumeration on `/subscribe`

**Fixed.** The endpoint now always returns `201` for valid input, regardless of whether the email already exists or was re-activated.

*Original finding:* Returning `409 "Already subscribed"` vs `201` allowed email enumeration.
*Fix applied:* Always return `201` for valid input. The DB unique constraint handles deduplication.

### ⚠️ M2. KV rate limiter is racy

**Open.** The rate limiter still uses read-modify-write on KV, which is non-atomic and eventually consistent (~60s). A burst of concurrent requests can bypass the cap.

File: `apps/api/src/lib/rate-limit.ts`
Fix: use a Durable Object counter, or the Cloudflare Rate Limiting binding (atomic).

### ⚠️ M3. `*.workers.dev` URL not disabled

**Open.** The default `*.workers.dev` subdomain is still enabled, bypassing zone WAF / Bot Management.

File: `apps/api/wrangler.toml`
Fix: set `workers_dev = false` in top-level and `[env.staging]`.

### ⚠️ M4. Production CORS effectively absent

**Open.** With `ALLOWED_ORIGIN=""` the `cors()` middleware is skipped, so no ACAO header is set. Safe today because JSON content-type forces preflight, but a future `ALLOWED_ORIGIN="*"` for debugging would expose responses cross-origin.

File: `apps/api/src/app.ts`
Fix: set `ALLOWED_ORIGIN="https://blog.hmziq.rs"` explicitly. Never accept `*`.

### ✅ M5. No runtime guard on `TURNSTILE_SECRET_KEY`

**Fixed.** The subscribe endpoint now rejects requests with a `503 Service misconfigured` if `TURNSTILE_SECRET_KEY` is empty or matches a known test key pattern.

*Original finding:* If the secret was left as a Cloudflare test key, every CAPTCHA would pass and the only bot defense would be the rate limiter.
*Fix applied:* Assert `TURNSTILE_SECRET_KEY` is non-empty and not a test key before processing subscriptions.

### ⚠️ M6. Hard-delete on unsubscribe — no audit, blacklist unused

**Partially fixed.** Unsubscribe now performs a soft delete (`UPDATE subscribers SET status='unsubscribed'…`), preserving the audit trail. However, the `blacklist` table from `0001_initial.sql` is **never populated** — the queue consumer does not handle hard bounces or insert into `blacklist`.

*Fix applied:* Soft delete with status tracking.
*Still open:* Populate `blacklist` on hard bounces in `queue-consumer.ts`.

## Low

### ✅ L1. PII in error logs

**Fixed.** Error logs now only include the error message, not the request body or email addresses.

*Original finding:* `console.error("…", error)` could include email/body when D1 or JSON parsing threw.
*Fix applied:* Log error codes/messages only; never the request body.

### ✅ L2. `submitTime` is client-controlled

**Not applicable / Fixed.** No `submitTime` check exists in the current subscription flow. If this was previously implemented, it has been removed.

*Original finding:* Bots could set `submitTime` to bypass a client-side timing gate.
*Current state:* No `submitTime` field is read or validated in `subscribe.ts`.

### ✅ L3. Honeypot dead branch

**Fixed.** The honeypot schema now uses `z.string().optional()` (no `max(0)`), so non-empty values reach the silent-201 branch as intended.

*Original finding:* `honeypot: z.string().max(0).optional()` caused Zod to reject non-empty values with 400 before the silent-201 branch could run.
*Fix applied:* Relaxed schema to allow any string; non-empty honeypot values now receive a fake 201 response.

### ✅ L4. `Content-Type` substring check

**Fixed.** Both subscribe and unsubscribe now parse Content-Type with `header.split(";")[0].trim() === "application/json"`, rejecting malformed types.

*Original finding:* `.includes("application/json")` accepted `application/json-pretend`.
*Fix applied:* Strict Content-Type parsing.

### ✅ L5. `CF-Connecting-IP` fallback to `"unknown"`

**Fixed.** Both subscribe and unsubscribe now reject the request with `400` when `CF-Connecting-IP` is missing in production (`ENVIRONMENT === "production"`).

*Original finding:* Missing header caused all callers to share one rate-limit bucket, allowing a single bad actor to deny service.
*Fix applied:* Reject requests with missing `CF-Connecting-IP` in production.

### ⚠️ L6. Unsubscribe tokens stored plaintext

**Open.** Unsubscribe tokens are still stored as plaintext in D1. Anyone with DB read access can unsubscribe any user.

File: `apps/api/migrations/0001_initial.sql`
Fix: store SHA-256 hash; lookup by hash.

### ⚠️ L7. Queue consumer retries forever, no DLQ

**Open.** `catch { msg.retry() }` with no `dead_letter_queue` configured. Permanent failures (rejected addresses) silently churn until max retries, then drop with no signal.

File: `apps/api/src/modules/newsletter/queue-consumer.ts`, `wrangler.toml`
Fix: configure `dead_letter_queue = "newsletter-dlq"` and log failure cause before retry.

### ✅ L8. Failed Turnstile still burns rate-limit budget

**Fixed.** Rate limiting now happens *after* Turnstile verification passes. Failed CAPTCHAs no longer consume the rate-limit budget.

*Original finding:* Rate limit was consumed before `siteverify`, allowing botnets with junk tokens to exhaust a victim's budget.
*Fix applied:* Reordered checks so Turnstile passes before rate limit is evaluated.

### ✅ L9. Missing `X-Content-Type-Options: nosniff` on API responses

**Fixed.** `app.ts` now sets `X-Content-Type-Options: nosniff` on all `/api/*` responses via a middleware.

*Original finding:* JSON responses didn't set the header.
*Fix applied:* One-line middleware after `cors()` that adds the header.

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
| H1  | `unsubscribe.route.test.ts`                            | `GET /api/newsletter/unsubscribe?token=…`                                  | Returns 404 (no GET handler); row unchanged                                                         |
| H1  | `unsubscribe.route.test.ts`                            | `POST` with valid token                                                    | Returns 200; row soft-deleted (see M6)                                                              |
| H2a | `send.route.test.ts`                                   | Two concurrent `POST /send` same slug                                      | Exactly one `sendBatch` call; one 200 enqueued, one 200 "already sent"; `newsletter_sent` has 1 row |
| H2b | `send.route.test.ts`                                   | `POST /send` with slug not in content collection                           | Returns 400; queue not called ⚠️ *Not yet implemented*                                              |
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
