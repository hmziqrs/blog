# Cloudflare Setup (Stage + Prod)

## 1. Prerequisites

- Cloudflare account with domain added
- `wrangler` CLI installed and authenticated (`wrangler login`)
- R2 plan enabled (free tier ok)

## 2. Create D1 Databases

```bash
wrangler d1 create blog-db
wrangler d1 create blog-db-staging
```

Copy each `database_id` into `apps/api/wrangler.toml`:
- `[[d1_databases]]` → prod id
- `[[env.staging.d1_databases]]` → staging id

## 3. Create KV Namespaces

```bash
wrangler kv namespace create RATE_LIMIT_KV
wrangler kv namespace create RATE_LIMIT_KV --env staging
```

Copy each `id` into `wrangler.toml`:
- `[[kv_namespaces]]` → prod id
- `[[env.staging.kv_namespaces]]` → staging id

## 4. Create Queues

```bash
wrangler queues create newsletter-send
wrangler queues create newsletter-send-staging
```

## 5. Create R2 Bucket

```bash
wrangler r2 bucket create blog-media
```

Generate S3-compatible tokens in Cloudflare dashboard and set:
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME=blog-media`
- `R2_PUBLIC_URL=https://<custom-or-r2-domain>/<bucket>`

## 6. Configure Custom Domain / Routes (Optional)

If using `blog.hmziq.rs` instead of `*.workers.dev`:

```toml
# apps/api/wrangler.toml — uncomment:
routes = [
  { pattern = "blog.hmziq.rs/api/newsletter/*", zone_name = "hmziq.rs" }
]
```

Also update `.env.staging` and `.env.production` URLs to match your actual domains.

## 7. Set Worker Secrets

```bash
wrangler secret put TURNSTILE_SECRET_KEY
wrangler secret put NEWSLETTER_SEND_SECRET
wrangler secret put EMAIL_FROM_ADDRESS

# Staging variants
wrangler secret put TURNSTILE_SECRET_KEY --env staging
wrangler secret put NEWSLETTER_SEND_SECRET --env staging
wrangler secret put EMAIL_FROM_ADDRESS --env staging
```

## 8. Create Pages Projects

Dashboard → Pages → Create:
- **Prod**: `web` (production branch: `master`)
- **Staging**: `web-staging` (production branch: `staging`)

Or deploy first time via CLI:
```bash
bun run deploy:web:staging
bun run deploy:web:prod
```

## 9. Migrate Databases

```bash
bun run db:migrate:staging
bun run db:migrate:prod
```

## 10. GitHub Secrets

Add to repo secrets:

| Secret | Used By |
|--------|---------|
| `CLOUDFLARE_API_TOKEN` | All deploys |
| `CLOUDFLARE_ACCOUNT_ID` | All deploys |
| `R2_ACCOUNT_ID` | Media upload |
| `R2_ACCESS_KEY_ID` | Media upload |
| `R2_SECRET_ACCESS_KEY` | Media upload |
| `R2_BUCKET_NAME` | Media upload |
| `R2_PUBLIC_URL` | Media upload + deploy |

## 11. Deploy

```bash
# Staging (manual or push to staging branch)
bun run deploy:staging

# Production (push to master triggers CI)
bun run deploy:prod
```

## 12. Verify

| Resource | Prod | Staging |
|----------|------|---------|
| Web | `https://blog.hmziq.rs` | `https://web-staging.pages.dev` |
| API | `https://api.<account>.workers.dev` | `https://api-staging.<account>.workers.dev` |
| Newsletter | `POST /api/newsletter/subscribe` | Same |
