# CI/CD Plan

Single `master` branch. File-based deploy gates. Push anytime: staging always deploys, prod is gated on specific file changes.

> Status: design doc. Replaces the master+staging branch model in the current `ci.yml`.

## How it works

Every push to master deploys staging (full stack: web + api + migrations). Prod deploys only when specific files change in that push:

- `content/**` changed → web prod
- New `changelog/v*.md` added → web prod + api prod (release)

API code, migrations, and shared packages do **not** deploy to prod on path changes alone. They land on staging on every push and ship to prod only when a `changelog/v*.md` is added. The changelog is the guard: it forces every API/code release through staging first.

PRs run QA only. No deploys from PRs. `workflow_dispatch` is the manual override.

## Content

Two independent content trees with the same structure:

```
content/           # production content
content-staging/   # staging content
```

Each environment renders its own tree. `content-staging/` is **not** a drafts area, WIP, or experiments folder. It exists so you can change staging content (test layouts, swap copy, seed sample data) without touching prod. Both trees stand on their own.

The build picks one via `CONTENT_DIR`:

| Env     | `CONTENT_DIR`     |
| ------- | ----------------- |
| prod    | `content`         |
| staging | `content-staging` |

`CONTENT_DIR` is the content root. `posts/`, `newsletters/`, `media/` resolve relative to it. One env var covers everything; `NEWSLETTER_DIR` and `MEDIA_DIR` are not used.

The Astro loader (`apps/web/src/content.config.ts`) currently reads `CONTENT_DIR` as the posts directory; it needs a small adjustment to treat it as the content root.

## Changelog

```
changelog/
├── v0.0.1.md
└── v0.0.2.md
```

One file per release, immutable once committed. Fix typos in the next version, not in place. Filename pattern: `v\d+\.\d+\.\d+\.md`. Rendered at `/changelog`.

Adding a new version file is the release event: it deploys both web and API to prod.

## Deploy gates

Uses [dorny/paths-filter](https://github.com/dorny/paths-filter), which handles force-push and first-push cases that raw `git diff` does not.

| Gate         | Trigger                       | Deploys             |
| ------------ | ----------------------------- | ------------------- |
| `release`    | Added `changelog/v*.md`       | web prod + api prod |
| `content`    | Any change under `content/**` | web prod            |
| _(implicit)_ | Every push to master          | staging always      |

`added`-only on `release` enforces immutability for deploy purposes: editing an existing version file does not trigger a redeploy.

## Newsletter

Manual via `workflow_dispatch` in `.github/workflows/send-newsletter.yml`.

Inputs:

- `issue_slug`: filename under `content/newsletters/` (or `content-staging/newsletters/` for test sends)
- `environment`: `staging` or `production`

A newsletter file in `content/newsletters/` becomes a public archive page on the next prod web deploy regardless of whether the email has been sent.

## Rollback

- **Web or API code:** revert the offending commit, then add a new `changelog/vX.Y.Z.md` describing the rollback. The changelog file is what triggers the redeploy. Versions only move forward.
- **Migrations:** forward-only. Write a new migration that reverses the change, then ship it via a `changelog/v*.md`.
- **Posts:** delete the file under `content/posts/`. The `content` gate redeploys without it.
- **Newsletter:** cannot unsend. To remove the public archive page, delete the file under `content/newsletters/`.

For emergencies, `workflow_dispatch` with an explicit env target bypasses the gates.

## Infrastructure

| Resource  | Staging                       | Production             |
| --------- | ----------------------------- | ---------------------- |
| D1        | `blog-db-staging`             | `blog-db`              |
| R2        | `blog-media-staging`          | `blog-media`           |
| Queue     | `newsletter-send-staging`     | `newsletter-send`      |
| DLQ       | `newsletter-dlq-staging`      | `newsletter-dlq`       |
| KV        | `RATE_LIMIT_KV` (staging)     | `RATE_LIMIT_KV` (prod) |
| Worker    | `api-staging` (.workers.dev)  | `api` (route on zone)  |
| Pages     | `hmziqblog` (staging branch)  | `hmziqblog` (master branch) |
| Turnstile | Test keys                     | Real keys              |
| URL       | `staging.hmziqblog.pages.dev` | `blog.hmziq.rs`        |
| API       | `api-staging.*.workers.dev`   | `blog.hmziq.rs/api/*`  |

Single Pages project (`hmziqblog`). Staging deploys to the `staging` branch as a Cloudflare Pages preview deployment at `staging.hmziqblog.pages.dev`. Production deploys to `master` branch at `blog.hmziq.rs`. Secrets use the existing pattern: `STAGE_` prefix for staging, no prefix for prod.

## CI workflow shape

```yaml
on:
  push:
    branches: [master]
  pull_request:
  workflow_dispatch:

concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: false

jobs:
  qa:
    # lint, fmt, typecheck, test — always

  detect:
    needs: qa
    outputs:
      release: ${{ steps.f.outputs.release }}
      content: ${{ steps.f.outputs.content }}
    steps:
      - uses: dorny/paths-filter@v3
        id: f
        with:
          filters: |
            release:
              - added: 'changelog/v*.md'
            content:
              - 'content/**'

  deploy-staging:
    needs: qa
    if: github.ref == 'refs/heads/master' && github.event_name == 'push'
    # bun run deploy:staging  (CONTENT_DIR=content-staging, full stack)

  deploy-web-prod:
    needs: [detect, deploy-staging]
    if: needs.detect.outputs.release == 'true' || needs.detect.outputs.content == 'true'
    # bun run deploy:prod:web  (CONTENT_DIR=content)

  deploy-api-prod:
    needs: [detect, deploy-staging]
    if: needs.detect.outputs.release == 'true'
    # wrangler deploy + apply migrations
```

`deploy-staging` is the smoke test for prod. If it fails, both prod jobs are blocked.

`deploy:prod` needs to split into `deploy:prod:web` and `deploy:prod:api` so a content change can ship a web-only deploy without touching the Worker.

## FAQ

**Q: Why not tags?** Versioned changelog files give the same effect inline with the change, no extra command.

**Q: Deploy prod without a changelog or content change?** `workflow_dispatch` with an explicit env target. The gates are a safety net, not a cage.

## Related

- [Staging Environment Setup](./STAGING_SETUP.md)
- [Production Environment Setup](./PRODUCTION_SETUP.md)
- `apps/web/src/content.config.ts`: reads `CONTENT_DIR` (currently as posts dir, needs change to read as content root)
- `apps/api/wrangler.toml`: Worker + environment config
- `.github/workflows/ci.yml`: current CI (to be replaced)
