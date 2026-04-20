# Production Readiness Audit — Fix Checklist

Date: 2026-04-20
Branch: `master`

Legend: 🔴 blocker (deploy is broken) · 🟠 security/abuse · 🟡 correctness · 🔵 nice-to-have

---

## 🔴 Blockers — the site will deploy but features won't work

- [ ] **Pick a runtime for API routes.** `apps/web/astro.config.ts:8` has `output: "static"` but `src/pages/api/newsletter/*.ts` defines `POST` handlers. Options:
  - [ ] Switch to `output: "server"` + install `@astrojs/cloudflare` adapter, **or**
  - [ ] Move `/api/newsletter/*` into a standalone Cloudflare Worker and keep Pages as SSG
- [ ] **Fix `wrangler.toml`.** `apps/web/wrangler.toml:2` references `./src/entry-worker.ts` which does not exist. Either create it or remove the `main` field once the runtime model is decided.
- [ ] **Fill in `database_id`** for prod and dev in `apps/web/wrangler.toml:12,21`.
- [ ] **Implement email sending.** `scripts/send-newsletter.ts:138-143` `sendEmail` is a `console.log` stub. Pick a provider (Resend recommended over the deprecated MailChannels path).
- [ ] **Fix newsletter workflow branch.** `.github/workflows/send-newsletter.yml:5` triggers on `main`, default branch is `master`.
- [ ] **Create the unsubscribe page.** `scripts/send-newsletter.ts:111` links to `/newsletter/unsubscribe` — that route does not exist. Needs a GET page that accepts `?token=…` and calls the API.
- [ ] **Add a Cloudflare Pages deploy step.** `.github/workflows/ci.yml` builds but never publishes — add `wrangler pages deploy dist` or the `cloudflare/pages-action`.
- [ ] **Stop committing `data.db`.** It's tracked (`git ls-files data.db`). Add to `.gitignore`, `git rm --cached data.db`.

---

## 🟠 Newsletter — security & anti-abuse

- [ ] **Fix Astro endpoint signature.** `apps/web/src/pages/api/newsletter/subscribe.ts:50` destructures `{ request, env }`. Astro gives `APIContext`; Cloudflare bindings are at `context.locals.runtime.env`. Current code would 500 every request.
- [ ] **Add double opt-in.** Currently anyone can enroll any email. Insert with `status = 'pending'`, email a signed confirmation link, flip to `active` on click.
- [ ] **Pass `remoteip` to Turnstile siteverify** (`subscribe.ts:72`) to prevent token sharing.
- [ ] **Drop blacklist-on-unsubscribe.** `unsubscribe.ts:37-40` inserts the email into `blacklist`, which permanently blocks re-subscription.
- [ ] **Strengthen rate limiting.** `subscribe.ts:16` is 3/min per IP with no per-email cap and no global cap. Prefer Cloudflare's edge rate-limiting rule. Add a per-email cooldown.
- [ ] **Rate-limit `/api/newsletter/unsubscribe`** too.
- [ ] **Replace `z.string().email()` with `z.email()`** (Zod 4).
- [ ] **Normalize emails** beyond `.toLowerCase()` — collapse gmail plus-addresses, block disposable domains.
- [ ] **Add a honeypot field** and a minimum submit-time check on the form.
- [ ] **Generate per-subscriber unsubscribe tokens in newsletter HTML.** `scripts/send-newsletter.ts:111` uses the same URL for every recipient — users can't actually unsubscribe.
- [ ] **Record per-recipient send status.** `newsletter_sent` only tracks `(post_slug)`. Add a `newsletter_deliveries` table keyed on `(post_slug, subscriber_id, status)` so you can retry failures.
- [ ] **Batch + retry in the sender.** Current loop is sequential with no error handling — a single failure stops the run.
- [ ] **Stop picking "latest post" by filename sort.** `send-newsletter.ts:63` sorts lexicographically; use frontmatter `pubDate`.

---

## 🟠 Web hardening

- [ ] **Add `_headers` for Cloudflare Pages** with CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy.
- [ ] **Robots.txt:** verify `/api/*` is disallowed.
- [ ] **Firebase Analytics consent.** Loads unconditionally today — add a consent banner or gate behind opt-in (GDPR/CCPA).
- [ ] **Bump `compatibility_date`** in `wrangler.toml` from `2024-01-01` to a current date.
- [ ] **Consolidate `.env.example`.** Root and `apps/web/.env.example` diverge — merge them.

---

## 🟡 Image pipeline

- [ ] **Persist the media dedupe DB across CI runs.** `scripts/media-pipeline.ts` stores state in `data.db`. In CI the file is absent/stale, so every run re-uploads everything. Either cache `data.db` as a CI artifact or list R2 on startup to rebuild the map.
- [ ] **Reconcile deleted files.** Files removed from `content/media/` stay in R2 forever. Add a cleanup pass.
- [ ] **Key rewrites by relative path, not basename.** `scripts/media-pipeline.ts:168` — `dir-a/foo.jpg` and `dir-b/foo.jpg` collide.
- [ ] **Add an upload size guard** (e.g. reject > 10 MB).

---

## 🟡 Tests

- [ ] **No tests cover the newsletter endpoints.** Add integration tests for subscribe (happy path, duplicate, blacklisted, bad captcha, rate-limit).
- [ ] **No tests cover the send-newsletter script** path selection or HTML generation.

---

## 🔵 Observability & ops

- [ ] **Error monitoring:** wire Sentry or Cloudflare Workers Analytics Engine / Logpush.
- [ ] **Admin query script:** a helper to list subscribers and recent sends without hand-writing SQL.
- [ ] **Dry-run flag** for `scripts/send-newsletter.ts` so you can preview HTML and recipient count before sending.

---

## Suggested order

1. Runtime-model decision (Astro SSR on Pages vs. separate Worker) — everything API-shaped depends on this
2. Branch-name + `entry-worker.ts` + `database_id` fixes
3. `data.db` untrack + gitignore
4. Rewrite subscribe/unsubscribe with the correct Astro signature, double opt-in, and proper unsubscribe URL
5. Implement email sending (Resend) with per-subscriber unsubscribe tokens
6. Pages deploy step + `_headers` + Firebase consent
