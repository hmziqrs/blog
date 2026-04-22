# Extract Newsletter API into a Standalone Cloudflare Worker

## Context

We've spent hours fighting Astro 6 + `@astrojs/cloudflare`'s dev server. The three output modes all fail for our setup:
- `output: "hybrid"` — removed in Astro 6, Astro refuses to start.
- `output: "static"` — silently ignores `export const prerender = false`, so API routes would be pre-rendered to broken static HTML.
- `output: "server"` — dev server crashes with `module is not defined` inside `@cloudflare/vite-plugin`'s workerd module runner whenever a route is requested.

The blog is 99% static content. Only 3 endpoints (`/api/newsletter/{subscribe,unsubscribe,send}`) need a runtime. Forcing an SSR Astro shim to support 3 endpoints has us shipping Cloudflare adapter internals, `ssr.noExternal: true` hacks, per-page `prerender` markers, and a dev server that doesn't work.

**Decision:** split them. `apps/web/` goes back to pure static Astro (no adapter, no wrangler, no workerd). A new `apps/newsletter/` Cloudflare Worker owns the 3 endpoints. We route `blog.hmziq.rs/api/newsletter/*` to the Worker via Cloudflare Workers Routes — same-origin, no CORS, zero frontend changes.

Stack for the Worker: **Hono** (standard Workers framework, tiny, first-class TS, clean routing).

## Final Directory Structure

```
apps/
  web/                               # pure static Astro
    astro.config.ts                  # no adapter, output: "static"
    package.json                     # drop @astrojs/cloudflare
    src/                             # unchanged except deletions below
    (removed) src/pages/api/newsletter/*
    (removed) src/lib/email.ts, src/lib/mailer.ts
    (removed) wrangler.toml, migrations/
    (removed) src/__tests__/newsletter.test.ts
    (removed) src/__tests__/newsletter-send.test.ts
  newsletter/                        # NEW Cloudflare Worker (Hono)
    package.json
    wrangler.toml
    tsconfig.json
    migrations/0001_initial.sql      # moved from apps/web
    src/
      index.ts                       # Hono app + `export default app`
      env.ts                         # Bindings type
      routes/subscribe.ts
      routes/unsubscribe.ts
      routes/send.ts
      lib/email.ts                   # moved
      lib/mailer.ts                  # moved
      lib/rate-limit.ts              # extracted shared helper
      __tests__/newsletter.test.ts   # moved
scripts/
  send-newsletter.ts                 # unchanged (URL stays same)
  newsletter-utils.ts                # unchanged
  __tests__/newsletter-send.test.ts  # moved here
```

## File-by-file Actions

### Move (use `git mv`)
- `apps/web/migrations/0001_initial.sql` → `apps/newsletter/migrations/0001_initial.sql`
- `apps/web/src/lib/email.ts` → `apps/newsletter/src/lib/email.ts`
- `apps/web/src/lib/mailer.ts` → `apps/newsletter/src/lib/mailer.ts`
- `apps/web/src/__tests__/newsletter.test.ts` → `apps/newsletter/src/__tests__/newsletter.test.ts`
- `apps/web/src/__tests__/newsletter-send.test.ts` → `scripts/__tests__/newsletter-send.test.ts` (update import path)

### Delete
- `apps/web/src/pages/api/newsletter/` (subscribe.ts, unsubscribe.ts, send.ts)
- `apps/web/wrangler.toml`
- `apps/web/migrations/` (now empty)

### Edit in place
- `apps/web/astro.config.ts` — remove `cloudflare()` adapter, set `output: "static"`, remove `ssr.noExternal`
- All static pages: remove the `export const prerender = true` we added earlier (unnecessary with `output: "static"`). Files: `404.astro`, `[page].astro`, `advertise.astro`, `categories.astro`, `category/[category].astro`, `index.astro`, `newsletter.astro`, `newsletter/unsubscribe.astro`, `posts/[...slug].astro`, `tags/[tag].astro`, `tags/index.astro`, `rss.xml.ts`, `robots.txt.ts`, `og-default.svg.ts`, `api/*.json.ts` (all 6)
- `apps/web/package.json` — remove `@astrojs/cloudflare` and `wrangler` deps
- Root `package.json` — retarget `db:migrate*` scripts to `--config apps/newsletter/wrangler.toml`; add `dev:newsletter` and `deploy:newsletter`; `test` uses `turbo test` (covers both apps)
- `.github/workflows/ci.yml` — retarget sed + migration to `apps/newsletter/wrangler.toml`; add `wrangler deploy --config apps/newsletter/wrangler.toml` step before Pages deploy
- `.github/workflows/send-newsletter.yml` — unchanged (still hits `${SITE_URL}/api/newsletter/send`)

## New Files

### `apps/newsletter/package.json`
```json
{
  "name": "newsletter",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev --port 8788",
    "build": "wrangler deploy --dry-run --outdir dist",
    "deploy": "wrangler deploy",
    "check-types": "tsc --noEmit",
    "test": "bun test"
  },
  "dependencies": { "hono": "^4.6.0", "zod": "catalog:" },
  "devDependencies": {
    "@cloudflare/workers-types": "catalog:",
    "typescript": "catalog:",
    "wrangler": "^3.90.0",
    "bun-types": "^1.3.10"
  }
}
```

### `apps/newsletter/wrangler.toml`
```toml
name = "newsletter"
main = "src/index.ts"
compatibility_date = "2025-04-01"
compatibility_flags = ["nodejs_compat"]

# Same-origin routing — Worker intercepts /api/newsletter/* on the blog subdomain
routes = [
  { pattern = "blog.hmziq.rs/api/newsletter/*", zone_name = "hmziq.rs" }
]

[vars]
ENVIRONMENT = "production"

[[d1_databases]]
binding = "DB"
database_name = "blog-newsletter"
database_id = "00000000-0000-0000-0000-000000000000"  # CI sed target
```

SendEmail binding is set up in the Cloudflare Dashboard (Email Routing). Secrets via `wrangler secret put`:
- `TURNSTILE_SECRET_KEY`
- `NEWSLETTER_SEND_SECRET`
- `EMAIL_FROM_ADDRESS`

### `apps/newsletter/src/env.ts`
```ts
import type { D1Database, SendEmail } from "@cloudflare/workers-types";
export type Bindings = {
  DB: D1Database;
  SEND_EMAIL: SendEmail;
  TURNSTILE_SECRET_KEY: string;
  NEWSLETTER_SEND_SECRET: string;
  EMAIL_FROM_ADDRESS: string;
  ENVIRONMENT: string;
};
```

### `apps/newsletter/src/index.ts`
```ts
import { Hono } from "hono";
import type { Bindings } from "./env";
import subscribe from "./routes/subscribe";
import unsubscribe from "./routes/unsubscribe";
import send from "./routes/send";

const app = new Hono<{ Bindings: Bindings }>();
app.route("/api/newsletter/subscribe", subscribe);
app.route("/api/newsletter/unsubscribe", unsubscribe);
app.route("/api/newsletter/send", send);
app.notFound((c) => c.json({ error: "Not found" }, 404));
export default app;
```

### Routes — Translation Rules (Astro APIContext → Hono Context)
- `context.locals.runtime.env` → `c.env`
- `context.request.headers.get(x)` → `c.req.header(x)`
- `new URL(context.request.url).searchParams.get(k)` → `c.req.query(k)`
- `await context.request.json()` → `await c.req.json()`
- `new Response(JSON.stringify(o), { status, headers })` → `c.json(o, status)`
- Remove all `export const prerender = false` — not applicable in Workers.

Each route file exports a Hono sub-app (`export default app`) with one or more verb handlers. `subscribe.ts` has `POST /`. `unsubscribe.ts` has `GET /` (reads `?token=`) and `POST /` (reads JSON body). `send.ts` has `POST /` with `X-Send-Secret` header auth.

Extract the existing shared rate-limit logic (used in subscribe/unsubscribe) into `src/lib/rate-limit.ts` with `checkSubscribeRateLimit(db, ip, email)` and `checkUnsubscribeRateLimit(db, ip)`. Business logic (Turnstile verify, honeypot/submit-time, email normalization, UUID generation, D1 queries, batch sending) copies 1:1 from the existing Astro endpoints.

## Frontend Changes

**None.** URLs stay `/api/newsletter/*`. These components are untouched:
- `apps/web/src/components/NewsletterForm.astro`
- `apps/web/src/components/NewsletterModal.astro`
- `apps/web/src/pages/newsletter/unsubscribe.astro`
- `scripts/send-newsletter.ts`

## astro.config.ts (final)

```ts
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import icon from "astro-icon";
import { defineConfig } from "astro/config";
import { siteConfig } from "../../site.config.ts";

export default defineConfig({
  output: "static",
  site: siteConfig.publicSiteUrl,
  base: siteConfig.basePath,
  integrations: [sitemap(), icon()],
  vite: {
    plugins: [tailwindcss()],
    server: {
      proxy: {
        "/api/newsletter": "http://localhost:8788",
      },
    },
  },
});
```

The `vite.server.proxy` is dev-only (Vite ignores it during build), forwarding to the local Worker so the frontend can hit `/api/newsletter/*` from `astro dev` without CORS.

## CI Changes (`.github/workflows/ci.yml`)

- Replace `sed -i "s|.*database_id.*|database_id = \"$D1_DATABASE_ID\"|" apps/web/wrangler.toml` with `... apps/newsletter/wrangler.toml`
- Replace `wrangler d1 migrations apply blog-newsletter --config apps/web/wrangler.toml --remote` with `... --config apps/newsletter/wrangler.toml --remote`
- Before the Pages deploy step, add:
  ```yaml
  - name: Deploy newsletter Worker
    if: github.ref == 'refs/heads/master'
    run: bunx wrangler deploy --config apps/newsletter/wrangler.toml
    env:
      CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
      CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
  ```
- Pages deploy step unchanged.

## Migration Order (safe, stepwise)

1. Scaffold `apps/newsletter/` skeleton — package.json, tsconfig, wrangler.toml, `src/index.ts` stub returning 404. `bun install`.
2. `git mv` libs, tests, migration.
3. Port 3 routes to Hono (subscribe → unsubscribe → send). Run tests. `wrangler deploy --dry-run` to verify it builds.
4. Set secrets on the Worker: `wrangler secret put TURNSTILE_SECRET_KEY`, `NEWSLETTER_SEND_SECRET`, `EMAIL_FROM_ADDRESS`. Confirm SendEmail destination address is verified in Dashboard.
5. Deploy Worker with `routes` **commented out** first. Smoke-test via the Worker's `*.workers.dev` URL with curl.
6. Uncomment `routes` → `wrangler deploy` → Worker is now live at `blog.hmziq.rs/api/newsletter/*`. At this instant, the old Astro-adapter routes are bypassed.
7. Delete `apps/web/src/pages/api/newsletter/`, `apps/web/wrangler.toml`, `apps/web/src/lib/{email,mailer}.ts`, `apps/web/migrations/`. Remove `export const prerender` from all 17 pages. Update `astro.config.ts` to pure static. Remove `@astrojs/cloudflare` + `wrangler` from `apps/web/package.json`. `bun install`. Run `bun dev:web` to verify the dev server is happy.
8. Update `.github/workflows/ci.yml` and root `package.json` scripts.
9. Push to master. CI deploys both. Manual prod verification: subscribe + unsubscribe + trigger a send.

**Rollback path:** any step before #6 is reversible (the old routes are still serving). Step #6 is the single cutover; rolling back means redeploying the Worker without the `routes` config or deleting the route in the Dashboard.

## Critical Files

- `/Users/hmziq/os/blog/apps/newsletter/src/index.ts`
- `/Users/hmziq/os/blog/apps/newsletter/src/routes/{subscribe,unsubscribe,send}.ts`
- `/Users/hmziq/os/blog/apps/newsletter/src/lib/{email,mailer,rate-limit}.ts`
- `/Users/hmziq/os/blog/apps/newsletter/wrangler.toml`
- `/Users/hmziq/os/blog/apps/newsletter/package.json`
- `/Users/hmziq/os/blog/apps/newsletter/migrations/0001_initial.sql`
- `/Users/hmziq/os/blog/apps/web/astro.config.ts`
- `/Users/hmziq/os/blog/apps/web/package.json`
- `/Users/hmziq/os/blog/.github/workflows/ci.yml`
- `/Users/hmziq/os/blog/package.json`

## Risks & Mitigations

- **D1 re-migration** — `0001_initial.sql` uses `CREATE TABLE IF NOT EXISTS` everywhere, and D1's `d1_migrations` table tracks applied files by filename. Both configs (old and new) point to the same `database_name`/`database_id`, so D1 sees the file as already applied. **Do not renumber.**
- **Secrets** — Cloudflare secrets are scoped per-Worker. Re-run `wrangler secret put` on the newsletter Worker for all 3 secrets. Don't worry about Pages secrets.
- **Zone matching** — `routes = [{ pattern = "blog.hmziq.rs/api/newsletter/*", zone_name = "hmziq.rs" }]` assumes `hmziq.rs` is the Cloudflare zone. If the DNS zone is `blog.hmziq.rs` directly (subdomain zone), set `zone_name = "blog.hmziq.rs"`. Verify via Cloudflare Dashboard → DNS.
- **Route precedence** — Workers Routes intercept matching paths before Pages. Non-matching paths fall through to Pages. No conflicts expected.
- **Dev UX** — running both apps requires two processes. `bun run dev` can use Turbo to start both in parallel; the Vite proxy handles same-origin forwarding.
- **`bun run newsletter:send`** — already fetches `${SITE_URL}/api/newsletter/send`, which the Worker route now handles. No change needed. `SITE_URL` remains `https://blog.hmziq.rs`.

## Verification

After step #6:
```bash
curl -i https://blog.hmziq.rs/api/newsletter/subscribe \
  -X POST -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","token":"bogus"}'
# expect 400 "CAPTCHA verification failed"

curl -i 'https://blog.hmziq.rs/api/newsletter/unsubscribe?token=nonexistent'
# expect 404 "Subscriber not found"
```

After step #7 (web cutover):
```bash
bun run dev:web
# expect astro v6.1.7 ready, no "module is not defined", homepage loads
curl -sI http://localhost:4321/ | head -1
# expect HTTP/1.1 200 OK
```

Full end-to-end (post-merge to master):
1. Subscribe via the newsletter form on the live site.
2. Check D1: `bun run newsletter:admin stats`.
3. Manually trigger `newsletter-send` workflow; verify delivery log in D1.
4. Unsubscribe via the email link; verify row deleted.
