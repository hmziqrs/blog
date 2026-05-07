# CI/CD Plan

Single `master` branch. File-based deploy gates. No extra branches, no tags.

> Status: design doc, not yet implemented. Current `ci.yml` still uses a `master` + `staging` branch model — this plan replaces it.

## Philosophy

Push code anytime. Independent file-based triggers control what deploys.

```
push to master
├── Always: QA → deploy staging (1:1 prod replica)
├── If new changelog/web/v*.md added: deploy web prod
├── If content/** changed: deploy web prod (new post)
├── If apps/api/** changed: deploy API prod (no changelog needed)
├── If new changelog/mobile/v*.md added: cut mobile release
└── Manual workflow_dispatch: send newsletter
```

Each prod deploy is an explicit file change. No implicit magic.

---

## Content separation

### `content/` — production
Source of truth for published posts, newsletters, media. Files here are public.

### `content-staging/` — staging only
Drafts, WIP, experiments. **1:1 replica structure** of `content/` — staging URL renders this directory exactly as prod renders `content/`. Public via git is acceptable.

```
content-staging/
├── posts/
├── newsletters/
└── media/
```

Build mapping (env vars set per deploy job):

| Environment | `CONTENT_DIR`           | Source            |
|-------------|-------------------------|-------------------|
| Production  | `content/posts`         | Published posts   |
| Staging     | `content-staging/posts` | Drafts + WIP      |

Newsletters and media follow the same pattern via their own env vars (`NEWSLETTER_DIR`, `MEDIA_DIR`). The Astro content loader (`apps/web/src/content.config.ts`) already reads `CONTENT_DIR`.

### Promotion rule
**Move, don't copy.** When a draft promotes to prod, the same commit MUST delete the staging file and create the prod file. Copy-only leaves divergent versions of the same slug across environments.

---

## Changelogs

Two changelogs — one per **client**, not per app. Readers are users; users feel API changes through clients, so the API has no standalone changelog.

```
changelog/
├── web/
│   ├── v0.0.1.md
│   └── v0.0.2.md
└── mobile/
    └── v0.1.0.md
```

- An API change visible in web only → web changelog entry.
- An API change visible in both → entry in each, in client-specific language.
- Pure infra change (rate limit, queue tuning) → no changelog. API still deploys (path gate).

### Rules
- One file per release. **Immutable** once committed — fix typos in a follow-up version, not in place.
- Filename pattern: `v\d+\.\d+\.\d+\.md`. CI rejects anything else under `changelog/`.
- Rendered at `/changelog` on the blog (free release notes page).

---

## Deploy gates

CI uses [`dorny/paths-filter`](https://github.com/dorny/paths-filter) — handles force-push and first-push safely (raw `git diff ${{ before }}..${{ after }}` does not).

| Gate             | Trigger                                                  | Deploys              |
|------------------|----------------------------------------------------------|----------------------|
| `web-release`    | **Added** file matching `changelog/web/v*.md`            | Web prod             |
| `web-content`    | Any change under `content/**`                            | Web prod             |
| `api`            | Any change under `apps/api/**` (incl. `migrations/**`)   | API prod + migrate   |
| `mobile-release` | **Added** file matching `changelog/mobile/v*.md`         | Mobile release cut   |
| _staging_        | Every push to master                                     | Staging always       |

`--diff-filter=A` (added only) on the changelog gates — editing an existing version file does NOT trigger a deploy. Forces immutability without a separate lint.

### Scenarios

| Push contains                          | Staging | Web prod | API prod |
|----------------------------------------|---------|----------|----------|
| Only `content-staging/`                | Yes     | No       | No       |
| New `content/posts/*.md`               | Yes     | Yes      | No       |
| New `changelog/web/v*.md`              | Yes     | Yes      | No       |
| `apps/api/**` change                   | Yes     | No       | Yes      |
| `apps/api/migrations/**`               | Yes     | No       | Yes      |
| Doc / README / repo housekeeping       | Yes     | No       | No       |

---

## Pull requests

PRs run QA only (lint, fmt, typecheck, test). **No deploys from PRs.** Direct pushes to master are the norm; PRs are optional review hygiene.

---

## Newsletter

Manual only — `workflow_dispatch` in `.github/workflows/send-newsletter.yml`.

Inputs:
- `issue_slug` — filename under `content/newsletters/` (or `content-staging/newsletters/` for test sends).
- `environment` — `staging` (test list) or `production` (real subscribers).

Note: a newsletter file in `content/newsletters/` becomes a public archive page on the next prod deploy regardless of whether the email has been sent. To stage a newsletter:

1. Write the file in `content-staging/newsletters/`.
2. Test send with `workflow_dispatch` → `environment: staging`.
3. Move (not copy) to `content/newsletters/` and push → archive page goes live.
4. Dispatch with `environment: production` → email sends.

---

## Rollback

- **Web code:** revert the offending commit, then add `changelog/web/vX.Y.Z.md` describing the rollback. Version bumps forward, never reuses.
- **API:** revert the offending commit — path gate redeploys automatically. Migrations are forward-only; write a new migration that reverses the change.
- **Newsletter:** can't unsend. To remove the public archive page, delete the file under `content/newsletters/` — content gate redeploys without it.
- **Posts:** delete the file under `content/posts/`. Content gate redeploys without it.

For emergencies, `workflow_dispatch` with explicit env target bypasses all gates.

---

## Infrastructure

| Resource | Staging                       | Production               |
|----------|-------------------------------|--------------------------|
| D1       | `blog-db-staging`             | `blog-db`                |
| R2       | `blog-media-staging`          | `blog-media`             |
| Queue    | `newsletter-send-staging`     | `newsletter-send`        |
| DLQ      | `newsletter-dlq-staging`      | `newsletter-dlq`         |
| KV       | `RATE_LIMIT_KV` (staging)     | `RATE_LIMIT_KV` (prod)   |
| Worker   | `api-staging` (.workers.dev)  | `api` (route on zone)    |
| Pages    | `hmziqblog-staging` project   | `hmziqblog` project      |
| Turnstile| Test keys                     | Real keys                |
| URL      | `staging.hmziqblog.pages.dev` | `blog.hmziq.rs`          |
| API      | `api-staging.*.workers.dev`   | `blog.hmziq.rs/api/*`    |

Deploys are CLI-driven (`bun run deploy:staging` / `bun run deploy:prod`) targeting different Pages projects. **Not** Cloudflare Pages branch previews.

Secrets follow the existing pattern: `STAGE_` prefix for staging, no prefix for production.

---

## CI workflow shape

```yaml
on:
  push:
    branches: [master]
  pull_request:
  workflow_dispatch:

jobs:
  qa:
    # lint, fmt, typecheck, test — always

  detect:
    needs: qa
    # dorny/paths-filter outputs:
    #   web-release:    changelog/web/v*.md   (added only)
    #   web-content:    content/**
    #   api:            apps/api/**
    #   mobile-release: changelog/mobile/v*.md (added only)

  deploy-staging:
    needs: qa
    if: github.ref == 'refs/heads/master' && github.event_name == 'push'
    # bun run media:upload (staging R2)
    # bun run deploy:staging (CONTENT_DIR=content-staging/posts)

  deploy-web-prod:
    needs: [detect, deploy-staging]
    if: detect.outputs.web-release == 'true' || detect.outputs.web-content == 'true'
    # bun run media:upload (prod R2)
    # bun run deploy:prod (CONTENT_DIR=content/posts)

  deploy-api-prod:
    needs: [detect, deploy-staging]
    if: detect.outputs.api == 'true'
    # wrangler deploy + apply migrations

  cut-mobile-release:
    needs: detect
    if: detect.outputs.mobile-release == 'true'
    # EAS build / store submit pipeline
```

`deploy-staging` is the smoke test for prod — if it fails, prod jobs don't run.

---

## FAQ

**Q: Why not tags?**
Tags add manual friction and don't compose with file-gated CI. Versioned changelog files give the same effect and live inline with the change.

**Q: How do I deploy prod without a changelog or content change?**
Use `workflow_dispatch` with an explicit env target. The gates are a safety net, not a cage.

**Q: How do I move a post from staging to production?**
Delete from `content-staging/posts/` and create in `content/posts/` in the same commit.

**Q: Why no API changelog?**
Changelogs exist for readers. The API has no readers — its consumers are the web and mobile clients. API changes that surface to users get described in those clients' changelogs, in user-facing language.

**Q: Why is newsletter manual?**
Sending to real subscribers should be deliberate. Not every deploy is announcement-worthy.

---

## Related

- [Staging Environment Setup](./STAGING_SETUP.md)
- [Production Environment Setup](./PRODUCTION_SETUP.md)
- `apps/web/src/content.config.ts` — content loader (reads `CONTENT_DIR`)
- `apps/api/wrangler.toml` — Worker + environment config
- `.github/workflows/ci.yml` — CI/CD pipeline (current state)
