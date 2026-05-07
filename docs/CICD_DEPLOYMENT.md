# CI/CD Deployment Strategy

Single `master` branch. File-based deploy gates. Zero extra branches, zero tags.

## Philosophy

Push code anytime. Three independent file-based triggers control what happens next:

```
push to master
├── Always: QA → deploy staging (content-staging/ + api-staging)
├── If content/ changed: deploy production (new post published)
├── If CHANGELOG.md changed: deploy production (code/feature release)
└── If triggered manually: send newsletter (workflow_dispatch)
```

Each decision is an explicit file change. No implicit magic. No merging between content directories.

---

## Content Separation

### `content/` — Production

Source of truth for published blog posts. When a file lands here, it triggers a production deploy.

```
content/
├── posts/
│   ├── building-with-astro-6.md
│   ├── hello-world.md
│   └── shipping-with-less.md
├── newsletters/
└── media/
```

### `content-staging/` — Staging only

WIP posts, drafts, experiments. Never merged into `content/`. To publish, you create the file in `content/` — a copy or a rewrite, not a merge.

```
content-staging/
└── posts/
    └── draft-about-rust.md
```

Build mapping:

| Environment | `CONTENT_DIR` | Source |
|-------------|---------------|--------|
| Production  | `content/posts` | Published posts |
| Staging     | `content-staging/posts` | Drafts + WIP |

The Astro content loader (`apps/web/src/content.config.ts`) already reads `CONTENT_DIR` from env, so this requires no code changes — just setting different env vars in the deploy scripts.

---

## Deploy Gates

The CI workflow checks changed files on push:

```yaml
- name: Check what changed
  run: |
    # Get list of changed files
    changed=$(git diff --name-only ${{ github.event.before }} ${{ github.event.after }})

    # Gate 1: New post in production content
    echo "$changed" | grep -q "^content/" && echo "content_changed=true" >> $GITHUB_OUTPUT

    # Gate 2: Code/feature release
    echo "$changed" | grep -q "^CHANGELOG.md" && echo "changelog_changed=true" >> $GITHUB_OUTPUT
```

Production deploys fire if **either** gate is true:

```yaml
deploy-prod:
  needs: [qa, deploy-staging]
  if: |
    steps.diff.outputs.content_changed == 'true' ||
    steps.diff.outputs.changelog_changed == 'true'
```

### Scenarios

| Push contains | Staging | Production | When |
|---------------|---------|------------|------|
| Only staging content | Yes | No | Previewing a draft |
| New `content/posts/*.md` | Yes | Yes | Publishing a post |
| Updated `CHANGELOG.md` | Yes | Yes | Code/theme/feature release |
| Both content + changelog | Yes | Yes | Post + code release |
| Neither | Yes | No | Minor tweaks, typo fixes |

---

## Newsletter

Newsletters are **manual only** — not tied to content or changelog gates.

- Trigger: `workflow_dispatch` in `.github/workflows/send-newsletter.yml`
- Requires explicit decision: "this post is worth emailing subscribers about"
- Allows sending to staging (test list) or production (real subscribers) independently

Reasoning: not every post is newsworthy. A typo fix or niche post shouldn't hit subscriber inboxes.

---

## Staging vs Production Infrastructure

All infra is isolated — staging has its own:

| Resource | Staging | Production |
|----------|---------|------------|
| D1 | `blog-db-staging` | `blog-db` |
| R2 | `blog-media-staging` | `blog-media` |
| Queue | `newsletter-send-staging` | `newsletter-send` |
| DLQ | `newsletter-dlq-staging` | `newsletter-dlq` |
| KV | `RATE_LIMIT_KV` (staging) | `RATE_LIMIT_KV` (prod) |
| Worker | `api-staging` | `api` |
| Pages | `staging` branch preview | `master` production |
| Turnstile | Test keys | Real keys |
| URL | `staging.hmziqblog.pages.dev` | `blog.hmziq.rs` |
| API | `api-staging.*.workers.dev` | `blog.hmziq.rs/api/newsletter/*` |

Secrets follow the existing pattern: `STAGE_` prefix for staging, no prefix for production.

---

## CI Workflow (summary)

```yaml
on:
  push:
    branches: [master]    # single branch — no staging branch needed
  workflow_dispatch:       # for newsletter, manual deploys

jobs:
  qa:
    # lint, fmt, typecheck, test — always runs

  deploy-staging:
    needs: qa
    # always runs on push to master
    # builds with CONTENT_DIR=content-staging/posts

  deploy-prod:
    needs: [qa, deploy-staging]
    if: content/ changed || CHANGELOG.md changed
    # builds with CONTENT_DIR=content/posts
```

---

## FAQ

**Q: Why not tags?**
Tags add friction — you must remember to create them, and they don't integrate naturally with Cloudflare Pages branch deploys. File-based gates are already version-controlled.

**Q: What if I want to deploy prod without changing content or changelog?**
Use `workflow_dispatch` manually. The gate is a safety net, not a cage.

**Q: How do I move a post from staging to production?**
Create the file in `content/posts/`. Don't merge — that creates coupling. Copy is fine, rewrite is fine.

**Q: What about the mobile app in the future?**
Same pattern: `CHANGELOG-app.md` would gate app prod deploys. `content-app-staging/` and `content-app/` would separate app content.

**Q: Why is newsletter manual?**
Not every deploy is announcement-worthy. Sending to real subscribers should be an intentional act.

---

## Related

- [Staging Environment Setup](./STAGING_SETUP.md)
- [Production Environment Setup](./PRODUCTION_SETUP.md)
- `apps/web/src/content.config.ts` — Content loader (reads `CONTENT_DIR`)
- `apps/api/wrangler.toml` — Worker + environment config
- `.github/workflows/ci.yml` — CI/CD pipeline
