# Production Readiness Audit — Fix Checklist

Date: 2026-04-20
Branch: `master`
Last updated: 2026-04-21 — all items complete

Legend: 🔴 blocker · 🟠 security/abuse · 🟡 correctness · 🔵 nice-to-have

---

## 🔴 Blockers

- [x] **Pick a runtime for API routes.** `output: "static"` + `@astrojs/cloudflare` adapter. `export const prerender = false` on newsletter endpoints.
- [x] **Fix `wrangler.toml`.** Removed `main`, added placeholder `database_id`, bumped `compatibility_date` to `2025-04-01`.
- [x] **Fill in `database_id`.** Placeholder UUIDs in `wrangler.toml`. CI substitutes real value from `D1_DATABASE_ID` secret via `sed` before deploy.
- [x] **Implement email sending.** Cloudflare Workers `send_email` binding. Subscribe sends confirmation; send-newsletter triggers Worker endpoint.
- [x] **Fix newsletter workflow branch.** Triggers on `master`.
- [x] **Create the unsubscribe page.** `/newsletter/unsubscribe` — static, client-side fetch to `GET /api/newsletter/unsubscribe?token=…`.
- [x] **Add a Cloudflare Pages deploy step.** `ci.yml` runs `wrangler pages deploy` on master push.
- [x] **Remove `data.db` entirely.** Media metadata moved to D1. `data.db` removed from `.gitignore` — no longer exists.

---

## 🟠 Newsletter — security & anti-abuse

- [x] **Fix Astro endpoint signature.** All endpoints use `context.locals.runtime.env`.
- [x] **Add double opt-in.** `status='pending'` → confirmation email → `GET /api/newsletter/confirm` → `'active'`. `/newsletter/confirm` page handles the click.
- [x] **Pass `remoteip` to Turnstile siteverify.**
- [x] **Drop blacklist-on-unsubscribe.** Unsubscribe just deletes the row.
- [x] **Strengthen rate limiting.** 2/hr per-IP + 2/hr per-email on subscribe. 3/hr per-IP on unsubscribe. 5/hr per-IP on `confirm.ts`. `send.ts` is secret-authenticated only — no IP rate limit.
- [x] **Rate-limit `/api/newsletter/unsubscribe`.**
- [x] **Replace `z.string().email()` with `z.email()`** (Zod 4).
- [x] **Normalize emails.** `src/lib/email.ts` — strips plus-addressing for all providers, strips dots for Gmail, normalises `googlemail.com → gmail.com`.
- [x] **Add a honeypot field** and minimum submit-time check.
- [x] **Generate per-subscriber unsubscribe tokens in newsletter HTML.**
- [x] **Record per-recipient send status.** `newsletter_deliveries` table; `send-newsletter.ts` writes `sent`/`failed` rows.
- [x] **Batch + retry in the sender.** Batches of 10, per-email error handling.
- [x] **Stop picking "latest post" by filename sort.** Uses frontmatter `pubDate` via `.toSorted()`.
- [x] **HTML-escape email content.** `escapeHTML()` in `email.ts` sanitizes `post.title` and `post.excerpt` in newsletter HTML. `encodeURIComponent()` on URL parameters.
- [x] **Validate `Content-Type` on all API endpoints.** Returns 415 for non-JSON requests.
- [x] **Mitigate timing attack on email enumeration.** Added dummy DB query in "already subscribed" path to align timing with the sendMail path.
- [x] **Validate input length in send endpoint.** `slug`/`title` ≤ 256 chars, `excerpt` ≤ 4096 chars.
- [x] **Require explicit `SITE_URL`.** No production default in `send-newsletter.ts` trigger script.

---

## 🟠 Web hardening

- [x] **Add `_headers` for Cloudflare Pages.** CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy.
- [x] **Robots.txt:** `/api/` is disallowed.
- [x] **Firebase Analytics consent.** `ConsentBanner.astro` shows on first visit, gates `initAnalytics()` behind localStorage `analytics_consent`. `firebase/client.ts` only initialises if consent is `"true"`.
- [x] **Bump `compatibility_date`** to `2025-04-01`.
- [x] **Consolidate `.env.example`.** `apps/web/.env.example` removed; root `.env.example` is the single source covering all vars.

---

## 🟡 Image pipeline

- [x] **Store media metadata in D1.** `media` table in D1 (`0003_media_table.sql`). `media-pipeline.ts` uses the Cloudflare REST API — no local `data.db`, no GH Actions cache. Accessible from CI, local scripts, and the future admin panel.
- [x] **Cold-start recovery.** `syncD1FromR2()` lists R2 and rebuilds D1 when the `media` table is empty (first run or new DB).
- [x] **Reconcile deleted files.** `cleanup()` in `media-pipeline.ts` deletes R2 objects and D1 rows for files no longer present locally, runs after every upload.
- [x] **Key rewrites by relative path, not basename.** `buildR2Key()` uses path relative to `MEDIA_DIR`, preserving subdirectory structure. `rewrite()` warns on basename collisions.
- [x] **Add an upload size guard.** Files > 10 MB are skipped with a warning.

---

## 🟡 Tests

- [x] **Newsletter endpoint tests.** `src/__tests__/newsletter.test.ts` — `normalizeEmail` (11 cases), subscribe schema, unsubscribe schema.
- [x] **Send-newsletter script tests.** `src/__tests__/newsletter-send.test.ts` — `parsePost`, `getLatestPost`, `generateHTML` (12 tests). Pure functions extracted to `scripts/newsletter-utils.ts`.

---

## 🔵 Observability & ops

- [ ] **Error monitoring.** Sentry/Logpush require external account setup — out of scope for code-only work.
- [x] **Admin query script.** `scripts/newsletter-admin.ts` — `stats`, `subscribers`, `sends` subcommands. Run via `bun run newsletter:admin`.
- [x] **Dry-run flag** for `send-newsletter.ts` — `--dry-run`.
