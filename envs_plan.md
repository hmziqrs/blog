# Dev / Staging / Prod Deployment Plan

## Context

The repo has an API Worker (`apps/api/`) and a static Pages site (`apps/web/`). Today only prod deploys work, wired to CI-on-master. We want three clearly separated environments, both local and CI-driven deploys for staging and prod, and a single `bun run deploy:staging` / `bun run deploy:prod` that does everything (migrations + Worker + Web). CI mirrors the same scripts on branch push, with `[skip ci]` as the opt-out when you've already deployed locally.

This plan incorporates audit fixes from [Cloudflare env docs](https://developers.cloudflare.com/workers/wrangler/environments/), [Astro env vars docs](https://docs.astro.build/en/guides/environment-variables/), [Hono CORS docs](https://hono.dev/docs/middleware/builtin/cors), and [GitHub `[skip ci]` docs](https://docs.github.com/actions/managing-workflow-runs/skipping-workflow-runs).

**Environments:**

- `dev` = local only (`wrangler dev` + `astro dev`), no deployed target
- `staging` = deployed test env: `api-staging.<account>.workers.dev` + `web-staging.pages.dev`
- `prod` = deployed live: `blog.hmziq.rs/api/newsletter/*` + `blog.hmziq.rs` (web)

**CI triggers:**

- Push/merge to `master` → prod deploy
- Push to `staging` → staging deploy
- Any other branch / PR → QA only (lint, fmt, tests, type-check)
- `workflow_dispatch` available for manual re-runs
- `[skip ci]` in commit message skips CI deploy (does NOT skip the path-filtered newsletter send — see below)

## Changes by file

### 1. `apps/api/wrangler.toml` — add `[env.staging]`, keep prod top-level

```toml
name = "api"
main = "src/index.ts"
compatibility_date = "2025-04-01"
compatibility_flags = ["nodejs_compat"]

# Prod routes — uncomment to go live
# routes = [
#   { pattern = "blog.hmziq.rs/api/newsletter/*", zone_name = "hmziq.rs" }
# ]

[vars]
ENVIRONMENT = "production"
ALLOWED_ORIGIN = ""   # prod is same-origin; CORS off

[[d1_databases]]
binding = "DB"
database_name = "blog-db"
database_id = "<prod-d1-id>"

[[send_email]]
name = "SEND_EMAIL"

# ─── Staging ────────────────────────────────────────────
[env.staging]
name = "api-staging"   # explicit — clearer than auto-suffix

[env.staging.vars]
ENVIRONMENT = "staging"
ALLOWED_ORIGIN = "https://web-staging.pages.dev"   # exact match; replace with actual URL after first Pages deploy

[[env.staging.d1_databases]]
binding = "DB"
database_name = "blog-db-staging"
database_id = "<staging-d1-id>"

[[env.staging.send_email]]
name = "SEND_EMAIL"
```

Remove the current `[env.dev]` block — local dev uses miniflare's local SQLite (default behavior, no remote calls).

### 2. `apps/api/src/index.ts` — strict CORS gated on `ALLOWED_ORIGIN`

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

`src/env.ts` gets `ENVIRONMENT: string` and `ALLOWED_ORIGIN: string`.

### 3. `apps/web/src/**` — read `PUBLIC_API_BASE` (falls back to same-origin)

Three fetch sites:

- `apps/web/src/components/NewsletterForm.astro:59`
- `apps/web/src/components/NewsletterModal.astro:144`
- `apps/web/src/pages/newsletter/unsubscribe.astro:47`

Each becomes:

```ts
const API_BASE = import.meta.env.PUBLIC_API_BASE ?? "";
const response = await fetch(`${API_BASE}/api/newsletter/subscribe`, { ... });
```

Type in `apps/web/src/env.d.ts`:

```ts
interface ImportMetaEnv {
  readonly PUBLIC_API_BASE?: string;
  readonly PUBLIC_TURNSTILE_SITE_KEY?: string;
  // ...existing
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

### 4. `.env` files per mode (Astro `--mode` pattern)

Astro's Vite loads `.env.<mode>` when you pass `--mode <name>` to `astro build`. This is the documented per-env pattern and doesn't fight shell-env precedence.

- `.env` (gitignored) — your local dev values, unchanged
- `.env.staging` (**committed**, public values only) — for staging web build:
  ```
  PUBLIC_API_BASE=https://api-staging.<account>.workers.dev
  PUBLIC_TURNSTILE_SITE_KEY=<staging-turnstile-site-key>
  ```
- `.env.production` (**committed**, public values only) — for prod web build:
  ```
  PUBLIC_API_BASE=
  PUBLIC_TURNSTILE_SITE_KEY=<prod-turnstile-site-key>
  ```

Since these only contain `PUBLIC_*` values they are already exposed to the browser — safe to commit. Update `.gitignore` to allow `.env.staging` and `.env.production` while keeping `.env` and `.env.local` ignored.

### 5. `turbo.json` — declare env vars the web build depends on

Turbo only busts cache on env vars listed in the task's `env` field. Without this, swapping modes silently reuses a stale build.

```json
{
  "tasks": {
    "build": {
      "env": [
        "PUBLIC_API_BASE",
        "PUBLIC_TURNSTILE_SITE_KEY",
        "CONTENT_DIR",
        "R2_PUBLIC_URL",
        "SITE_URL"
      ]
    }
  }
}
```

### 6. `apps/web/package.json` — pass `--mode` through build

```json
{
  "scripts": {
    "build": "astro build",
    "build:staging": "astro build --mode staging",
    "build:prod": "astro build --mode production"
  }
}
```

### 7. Root `package.json` — new deploy scripts

```json
{
  "deploy:api:staging": "wrangler deploy --env staging --config apps/api/wrangler.toml",
  "deploy:api:prod": "wrangler deploy --config apps/api/wrangler.toml",

  "deploy:web:staging": "CONTENT_DIR=$(bun run media:rewrite) turbo -F web build:staging && wrangler pages deploy apps/web/dist --project-name=web-staging --branch=staging",
  "deploy:web:prod": "CONTENT_DIR=$(bun run media:rewrite) turbo -F web build:prod && wrangler pages deploy apps/web/dist --project-name=web --branch=master",

  "db:migrate:staging": "wrangler d1 migrations apply blog-db-staging --remote --env staging --config apps/api/wrangler.toml",
  "db:migrate:prod": "wrangler d1 migrations apply blog-db --remote --config apps/api/wrangler.toml",
  "db:migrate:local": "wrangler d1 migrations apply blog-db --local --config apps/api/wrangler.toml",

  "deploy:staging": "bun run db:migrate:staging && bun run deploy:api:staging && bun run deploy:web:staging",
  "deploy:prod": "bun run db:migrate:prod && bun run deploy:api:prod && bun run deploy:web:prod"
}
```

Remove the old `db:migrate:dev`, `db:query:dev`, `db:console:dev`, `db:create:dev` — `dev` is local now. Add `db:create:staging` for symmetry. Keep `dev:api` / `dev:web` / `dev` as today.

### 8. `.github/workflows/ci.yml` — branch-gated deploys

```yaml
name: CI
on:
  push:
    branches: [master, staging]
  pull_request:
  workflow_dispatch: # manual re-run support

jobs:
  qa:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun run lint
      - run: bun run fmt:check
      - run: turbo -F web check
      - run: bun run test

  deploy-staging:
    needs: qa
    if: (github.ref == 'refs/heads/staging' && github.event_name == 'push') || github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun run media:upload
        env:
          R2_ACCOUNT_ID: ${{ secrets.R2_ACCOUNT_ID }}
          R2_ACCESS_KEY_ID: ${{ secrets.R2_ACCESS_KEY_ID }}
          R2_SECRET_ACCESS_KEY: ${{ secrets.R2_SECRET_ACCESS_KEY }}
          R2_BUCKET_NAME: ${{ secrets.R2_BUCKET_NAME }}
          R2_PUBLIC_URL: ${{ secrets.R2_PUBLIC_URL }}
      - run: bun run deploy:staging
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          R2_PUBLIC_URL: ${{ secrets.R2_PUBLIC_URL }}

  deploy-prod:
    needs: qa
    if: github.ref == 'refs/heads/master' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun run media:upload
        env: # same R2_* block
      - run: bun run deploy:prod
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          R2_PUBLIC_URL: ${{ secrets.R2_PUBLIC_URL }}
```

Drops the sed substitution — real D1 IDs committed to `wrangler.toml`. Drops the `D1_DATABASE_ID` GH secret.

### 9. `.github/workflows/send-newsletter.yml` — path-filter trigger

Only fires when a post file actually changes, so `[skip ci]` on a code-only commit doesn't affect it. Also keeps `workflow_dispatch` for manual sends.

```yaml
name: Send Newsletter
on:
  push:
    branches: [master]
    paths:
      - "apps/web/src/content/posts/**"
  workflow_dispatch:

jobs:
  send-newsletter:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun run newsletter:send
        env:
          SITE_URL: ${{ secrets.SITE_URL }}
          NEWSLETTER_SEND_SECRET: ${{ secrets.NEWSLETTER_SEND_SECRET }}
```

Confirm path matches actual posts dir — likely `apps/web/src/content/posts/` per existing code. Adjust if your content directory is different.

### 10. `.env.example` — update

```
# ─── Cloudflare ──────────────────────────────────────────────────────────────
CLOUDFLARE_ACCOUNT_ID=
CLOUDFLARE_API_TOKEN=

# ─── Public (safe to expose in browser) ─────────────────────────────────────
# Staging/prod values live in .env.staging / .env.production (committed)
# This .env is your LOCAL values only.
PUBLIC_API_BASE=            # empty = same-origin; set for cross-origin dev
PUBLIC_TURNSTILE_SITE_KEY=

# ─── Worker secrets (set via `wrangler secret put`) ─────────────────────────
# TURNSTILE_SECRET_KEY
# NEWSLETTER_SEND_SECRET
# EMAIL_FROM_ADDRESS

# ─── For local newsletter sends via scripts/send-newsletter.ts ──────────────
SITE_URL=http://localhost:4321
NEWSLETTER_SEND_SECRET=

# ─── R2 / Media ─────────────────────────────────────────────────────────────
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=
```

## Critical files to modify

- `apps/api/wrangler.toml`
- `apps/api/src/index.ts`, `src/env.ts`
- `apps/web/src/components/NewsletterForm.astro:59`
- `apps/web/src/components/NewsletterModal.astro:144`
- `apps/web/src/pages/newsletter/unsubscribe.astro:47`
- `apps/web/src/env.d.ts`
- `apps/web/package.json`
- `.env.staging`, `.env.production` (new, committed)
- `.gitignore` (allow staged env files)
- `.env.example`
- `turbo.json`
- `package.json` (root)
- `.github/workflows/ci.yml`
- `.github/workflows/send-newsletter.yml`

## One-time manual setup

1. **Create D1s**: `wrangler d1 create blog-db` (if not already) and `wrangler d1 create blog-db-staging`. Paste IDs into `wrangler.toml`.
2. **Create Pages projects**:
   ```
   wrangler pages project create web --production-branch=master
   wrangler pages project create web-staging --production-branch=staging
   ```
3. **Worker secrets** (per env):
   ```
   wrangler secret put TURNSTILE_SECRET_KEY              # prod
   wrangler secret put NEWSLETTER_SEND_SECRET            # prod
   wrangler secret put EMAIL_FROM_ADDRESS                # prod
   wrangler secret put TURNSTILE_SECRET_KEY --env staging
   wrangler secret put NEWSLETTER_SEND_SECRET --env staging
   wrangler secret put EMAIL_FROM_ADDRESS --env staging
   ```
4. **Turnstile widgets**: in Cloudflare Turnstile dashboard create a second widget for `web-staging.pages.dev` domain (or skip Turnstile on staging). Set matching secret + site key.
5. **GitHub Actions secrets**: keep existing `CLOUDFLARE_*`, `R2_*`, `NEWSLETTER_SEND_SECRET`, `SITE_URL`. Remove `D1_DATABASE_ID`.
6. **Verify SendEmail destinations** in Cloudflare Email Routing.
7. **After first staging Pages deploy**: note the real `web-staging-<random>.pages.dev` URL and update `ALLOWED_ORIGIN` in `wrangler.toml` `[env.staging.vars]` if different from what's assumed.
8. **Uncomment prod `routes`** in `wrangler.toml` when ready to put the Worker in front of `blog.hmziq.rs`.

## Daily flow

- **Dev**: `bun run dev:api` + `bun run dev:web`. First time: `bun run db:migrate:local`.
- **Deploy staging from local**: `bun run deploy:staging`. Or push to `staging` branch.
- **Deploy prod from local**: `bun run deploy:prod`. Or merge PR to `master`.
- **Skip CI after local deploy**: add `[skip ci]` to commit message. Newsletter send is safe — it has its own path filter.

## Verification

1. **Local dev still works**: `bun run dev:web` proxies to local Worker.
2. **Staging dry-run**: `bunx wrangler deploy --env staging --config apps/api/wrangler.toml --dry-run` — confirm binding is `blog-db-staging`, `ENVIRONMENT=staging`.
3. **Full staging deploy**: `bun run deploy:staging` completes. Visit `web-staging.pages.dev/newsletter`, submit form → network shows POST to `api-staging.<account>.workers.dev/api/newsletter/subscribe` with CORS headers, returns 201.
4. **CORS rejection**: curl `api-staging.<account>.workers.dev/api/newsletter/subscribe` with `Origin: https://evil.pages.dev` → no `Access-Control-Allow-Origin` returned.
5. **Prod still same-origin**: `bun run deploy:prod` works, `blog.hmziq.rs/newsletter` form still subscribes (ALLOWED_ORIGIN empty → no CORS middleware applied).
6. **CI branch gating**: PR → qa only. Push to `staging` → deploy-staging. Push to `master` → deploy-prod.
7. **`[skip ci]` respected**: commit with `[skip ci]` + push → CI skipped.
8. **Newsletter send path filter**: commit that only touches a post under `apps/web/src/content/posts/` → `send-newsletter.yml` fires. Code-only commit → doesn't fire.
9. **Tests still green**: `bun run test` passes.
10. **Turbo cache invalidation**: change `PUBLIC_API_BASE` in `.env.staging`, rerun `deploy:web:staging` → fresh build, not cached.
