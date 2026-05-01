# Cloudflare Integration Security Audit

> **Status:** All audit findings have been implemented and verified. This document is now a historical record of the security improvements made. All items are marked with ✅.

Scope: `apps/api/` (Worker, routes, queue, rate limiter), `apps/web/` newsletter UI, `wrangler.toml`, D1 schema, CI workflows.

## High

### ✅ H1. GET unsubscribe → silent unsubscribes by link scanners

**Fixed.** The GET handler has been removed. Unsubscribe now requires POST only. Tokens are no longer exposed via query parameters in mail-scanner fetches.

_Original finding:_ Mail security gateways auto-fetch every URL in delivered email, deleting the subscriber. Tokens leak into history, Referer, proxy logs.
_Fix applied:_ Require POST for unsubscribe.

### ✅ H2. `/send` accepts arbitrary slug + race on duplicate sends

**Fixed.** The race condition is resolved via `INSERT … ON CONFLICT DO NOTHING`. Additionally, the send endpoint now validates that the slug exists in the `posts` table before enqueuing. Unknown slugs return `400`.

_Fix applied:_ `INSERT … ON CONFLICT DO NOTHING` first; proceed only if the row was newly inserted. Validate slug against `posts` table.

### ✅ H3. Non-constant-time secret comparison

**Fixed.** `send.ts` now uses a manual `timingSafeEqual` helper that compares encoded strings in constant time via XOR.

_Original finding:_ `secret !== c.env.NEWSLETTER_SEND_SECRET` short-circuited per byte.
_Fix applied:_ Byte-length-equal compare via constant-time XOR loop.

## Medium

### ✅ M1. Email enumeration on `/subscribe`

**Fixed.** The endpoint now always returns `201` for valid input, regardless of whether the email already exists or was re-activated.

_Original finding:_ Returning `409 "Already subscribed"` vs `201` allowed email enumeration.
_Fix applied:_ Always return `201` for valid input. The DB unique constraint handles deduplication.

### ✅ M2. KV rate limiter is racy

**Fixed.** Rate limiting now uses the D1 `rate_limits` table instead of KV. D1 provides much stronger consistency guarantees than KV's ~60s eventual consistency.

_Fix applied:_ Rewrote `lib/rate-limit.ts` to use D1 `rate_limits` table with `COUNT(*)` + `INSERT` pattern.

### ✅ M3. `*.workers.dev` URL not disabled

**Fixed.** `workers_dev = false` is now set in both top-level and `[env.staging]` sections of `wrangler.toml`.

_Fix applied:_ Added `workers_dev = false` to both environments.

### ✅ M4. Production CORS effectively absent

**Fixed.** `ALLOWED_ORIGIN` is now explicitly set to `"https://blog.hmziq.rs"` in production and `"https://web-staging.pages.dev"` in staging.

_Fix applied:_ Set explicit `ALLOWED_ORIGIN` values in `wrangler.toml`.

### ✅ M5. No runtime guard on `TURNSTILE_SECRET_KEY`

**Fixed.** The subscribe endpoint now rejects requests with a `503 Service misconfigured` if `TURNSTILE_SECRET_KEY` is empty or matches a known test key pattern.

_Original finding:_ If the secret was left as a Cloudflare test key, every CAPTCHA would pass and the only bot defense would be the rate limiter.
_Fix applied:_ Assert `TURNSTILE_SECRET_KEY` is non-empty and not a test key before processing subscriptions.

### ✅ M6. Hard-delete on unsubscribe — no audit, blacklist unused

**Fixed.** Unsubscribe performs a soft delete. The queue consumer now populates the `blacklist` table after a message exceeds the maximum retry count (`MAX_RETRIES = 5`).

_Fix applied:_ Soft delete with status tracking. Queue consumer inserts into `blacklist` on permanent delivery failures.

## Low

### ✅ L1. PII in error logs

**Fixed.** Error logs now only include the error message, not the request body or email addresses.

_Original finding:_ `console.error("…", error)` could include email/body when D1 or JSON parsing threw.
_Fix applied:_ Log error codes/messages only; never the request body.

### ✅ L2. `submitTime` is client-controlled

**Not applicable / Fixed.** No `submitTime` check exists in the current subscription flow. If this was previously implemented, it has been removed.

_Original finding:_ Bots could set `submitTime` to bypass a client-side timing gate.
_Current state:_ No `submitTime` field is read or validated in `subscribe.ts`.

### ✅ L3. Honeypot dead branch

**Fixed.** The honeypot schema now uses `z.string().optional()` (no `max(0)`), so non-empty values reach the silent-201 branch as intended.

_Original finding:_ `honeypot: z.string().max(0).optional()` caused Zod to reject non-empty values with 400 before the silent-201 branch could run.
_Fix applied:_ Relaxed schema to allow any string; non-empty honeypot values now receive a fake 201 response.

### ✅ L4. `Content-Type` substring check

**Fixed.** Both subscribe and unsubscribe now parse Content-Type with `header.split(";")[0].trim() === "application/json"`, rejecting malformed types.

_Original finding:_ `.includes("application/json")` accepted `application/json-pretend`.
_Fix applied:_ Strict Content-Type parsing.

### ✅ L5. `CF-Connecting-IP` fallback to `"unknown"`

**Fixed.** Both subscribe and unsubscribe now reject the request with `400` when `CF-Connecting-IP` is missing in production (`ENVIRONMENT === "production"`).

_Original finding:_ Missing header caused all callers to share one rate-limit bucket, allowing a single bad actor to deny service.
_Fix applied:_ Reject requests with missing `CF-Connecting-IP` in production.

### ✅ L6. Unsubscribe tokens stored plaintext

**Fixed.** Unsubscribe tokens are now derived deterministically via HMAC-SHA256 and only their SHA-256 hash is stored in D1. The plaintext token is never persisted. Unsubscribe lookups use the hash.

_Fix applied:_ `lib/tokens.ts` provides `deriveUnsubscribeToken()` and `hashToken()`. Subscribe stores hash; unsubscribe looks up by hash. Send endpoint derives tokens at enqueue time. Migration `0003_drop_plaintext_token.sql` recreates the `subscribers` table without the plaintext `unsubscribe_token` column.

### ✅ L7. Queue consumer retries forever, no DLQ

**Fixed.** A dead-letter queue (`newsletter-dlq`) is now configured in `wrangler.toml`. The queue consumer logs failures before retrying and blacklists emails after `MAX_RETRIES = 5`.

_Fix applied:_ Added `dead_letter_queue = "newsletter-dlq"` to queue consumers. Consumer logs errors and falls back to `msg.ack()` after max retries (with blacklist insertion).

### ✅ L8. Failed Turnstile still burns rate-limit budget

**Fixed.** Rate limiting now happens _after_ Turnstile verification passes. Failed CAPTCHAs no longer consume the rate-limit budget.

_Original finding:_ Rate limit was consumed before `siteverify`, allowing botnets with junk tokens to exhaust a victim's budget.
_Fix applied:_ Reordered checks so Turnstile passes before rate limit is evaluated.

### ✅ L9. Missing `X-Content-Type-Options: nosniff` on API responses

**Fixed.** `app.ts` now sets `X-Content-Type-Options: nosniff` on all `/api/*` responses via a middleware.

_Original finding:_ JSON responses didn't set the header.
_Fix applied:_ One-line middleware after `cors()` that adds the header.

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
