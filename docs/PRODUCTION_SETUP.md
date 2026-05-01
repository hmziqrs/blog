# Production Environment Setup

Complete checklist for setting up the **production** environment.

> **One-time setup:** If you already set up staging, some steps (R2 bucket, Email Routing, Turnstile) are already done. These are marked below — skip them if applicable.

---

## Prerequisites

- Cloudflare account with domain added
- `wrangler` CLI installed and authenticated (`wrangler login`)
- R2 plan enabled (free tier ok)

---

## 1. Create Production D1 Database

```bash
wrangler d1 create blog-db
```

Copy the `database_id` into `apps/api/wrangler.toml` under `[[d1_databases]]`.

---

## 2. Create Production KV Namespace

```bash
wrangler kv namespace create RATE_LIMIT_KV
```

Copy the `id` into `wrangler.toml` under `[[kv_namespaces]]`.

---

## 3. Create Production Queue

```bash
wrangler queues create newsletter-send
```

---

## 4. Create R2 Bucket (One-Time)

```bash
wrangler r2 bucket create blog-media
```

> Skip if already created for staging. Both environments share the same bucket.

Generate S3-compatible tokens in the Cloudflare dashboard and configure:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME=blog-media`
- `R2_PUBLIC_URL=https://<custom-or-r2-domain>/<bucket>`

---

## 5. Set Production Worker Secrets

```bash
wrangler secret put TURNSTILE_SECRET_KEY
wrangler secret put NEWSLETTER_SEND_SECRET
wrangler secret put EMAIL_FROM_ADDRESS
```

---

## 6. Enable Cloudflare Email Routing (One-Time)

1. Go to https://dash.cloudflare.com/
2. Navigate to **Email → Email Routing**
3. Verify your domain
4. Add `newsletter@<your-domain>` as a verified sender in **Email → Email Sending**

> Skip if already done for staging. Only needed once per domain.

---

## 7. Set Up Cloudflare Turnstile (One-Time)

1. Go to https://dash.cloudflare.com/
2. Navigate to **Turnstile**
3. Create a new site
4. Copy the **site key** and **secret key**

> Skip if already done for staging. The same Turnstile site works for both environments.

---

## 8. Configure Environment Variables

Create `.env.production`:

```
EMAIL_FROM_ADDRESS=newsletter@<your-domain>
NEWSLETTER_SEND_SECRET=<random-secret>
TURNSTILE_SECRET_KEY=<turnstile-secret-key>
PUBLIC_TURNSTILE_SITE_KEY=<turnstile-site-key>
```

Also update `site.config.ts` and any domain-specific URLs.

---

## 9. Configure Custom Domain / Routes (Optional)

If using a custom domain instead of `*.workers.dev`:

```toml
# apps/api/wrangler.toml — uncomment:
routes = [
  { pattern = "blog.hmziq.rs/api/newsletter/*", zone_name = "hmziq.rs" }
]
```

Also update `.env.production` URLs to match your actual domains.

---

## 10. Create Production Pages Project

Dashboard → **Pages → Create project**:

- **Project name**: `web`
- **Production branch**: `master`

Or deploy the first time via CLI:

```bash
bun run deploy:web:prod
```

---

## 11. Run Production Migrations

```bash
bun run db:migrate:prod
```

---

## 12. Deploy to Production

```bash
bun run deploy:prod
```

Or push to the `master` branch — CI will deploy automatically.

---

## 13. Verify Production

| Resource   | URL                                               |
| ---------- | ------------------------------------------------- |
| Web        | `https://blog.hmziq.rs`                           |
| API        | `https://api.<account>.workers.dev`               |
| Newsletter | `POST /api/newsletter/subscribe`                  |

---

## GitHub Secrets

Add these to your repository secrets for CI deploys:

| Secret                  | Used By               |
| ----------------------- | --------------------- |
| `CLOUDFLARE_API_TOKEN`  | All deploys           |
| `CLOUDFLARE_ACCOUNT_ID` | All deploys           |
| `R2_ACCOUNT_ID`         | Media upload          |
| `R2_ACCESS_KEY_ID`      | Media upload          |
| `R2_SECRET_ACCESS_KEY`  | Media upload          |
| `R2_BUCKET_NAME`        | Media upload          |
| `R2_PUBLIC_URL`         | Media upload + deploy |
| `SITE_URL`              | Newsletter workflow   |
| `NEWSLETTER_SEND_SECRET`| Newsletter workflow   |

---

## Architecture Note

Newsletter delivery is handled asynchronously via **Cloudflare Queues**:

- The `/send` endpoint enqueues messages in batches.
- `apps/api/src/modules/newsletter/queue-consumer.ts` processes the queue and calls `sendMail()` for each subscriber.
- This replaces the earlier direct-sending approach and provides better reliability and throughput.

---

## Related Files

- `apps/api/wrangler.toml` — Cloudflare Workers config
- `apps/api/migrations/0001_initial.sql` — Database schema
- `apps/api/src/modules/newsletter/` — API endpoints (subscribe, unsubscribe, send) + queue consumer
- `apps/api/src/lib/mailer.ts` — `send_email` wrapper
- `apps/web/src/components/NewsletterForm.astro` — Subscription form
- `apps/web/src/components/NewsletterModal.astro` — Scroll modal
- `scripts/send-newsletter.ts` — Newsletter trigger script (calls Worker endpoint)
- `.github/workflows/send-newsletter.yml` — CI/CD workflow
