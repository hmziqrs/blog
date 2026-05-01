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

## 2. Create Production Queues

The main queue and its dead letter queue (DLQ) must both be created explicitly:

```bash
wrangler queues create newsletter-send
wrangler queues create newsletter-dlq
```

Messages that fail after max retries are automatically routed to the DLQ instead of being deleted.

---

## 3. Create R2 Bucket (One-Time)

```bash
wrangler r2 bucket create blog-media
```

> Skip if already created for staging. Both environments share the same bucket.

Generate S3-compatible tokens in the Cloudflare dashboard (**R2 → Manage R2 API tokens**):

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME=blog-media`
- `R2_PUBLIC_URL` — use the `*.r2.dev` URL (e.g. `https://pub-abc123.r2.dev`) or a custom domain (e.g. `https://media.yourdomain.com`). Custom domains serve objects at the root path, not under the bucket name.

---

## 4. Set Production Worker Secrets

```bash
wrangler secret put TURNSTILE_SECRET_KEY
wrangler secret put NEWSLETTER_SEND_SECRET
wrangler secret put EMAIL_FROM_ADDRESS
```

---

## 5. Enable Cloudflare Email Routing (One-Time)

1. Go to https://dash.cloudflare.com/
2. Navigate to **Email → Email Routing**
3. Verify your domain
4. Add `newsletter@<your-domain>` as a **destination address** under **Email Routing → Destination addresses**

> Skip if already done for staging. Only needed once per domain.

---

## 6. Set Up Cloudflare Turnstile

1. Go to https://dash.cloudflare.com/
2. Navigate to **Turnstile**
3. Create a new site (e.g. `blog-prod`)
4. Copy the **site key** and **secret key**

> Cloudflare recommends creating separate widgets per environment (e.g. `blog-prod` and `blog-staging`) for independent analytics and configuration.

---

## 7. Configure Environment Variables

Create `.env.production`:

```
EMAIL_FROM_ADDRESS=newsletter@<your-domain>
NEWSLETTER_SEND_SECRET=<random-secret>
TURNSTILE_SECRET_KEY=<turnstile-secret-key>
PUBLIC_TURNSTILE_SITE_KEY=<turnstile-site-key>
```

Also update `site.config.ts` and any domain-specific URLs.

---

## 8. Configure Custom Domain Routes

Production uses `workers_dev = false` — the API is only accessible via custom domain routes. The routes are already configured in `wrangler.toml`:

```toml
routes = [
  { pattern = "blog.hmziq.rs/api/newsletter/*", zone_name = "hmziq.rs" }
]
```

If using a different domain, update the pattern accordingly. No `*.workers.dev` subdomain is available in production.

---

## 9. Create Production Pages Project

Dashboard → **Pages → Create project**:

- **Project name**: `web`
- **Production branch**: `master`

Or deploy the first time via CLI:

```bash
bun run deploy:web:prod
```

---

## 10. Run Production Migrations

```bash
bun run db:migrate:prod
```

---

## 11. Deploy to Production

```bash
bun run deploy:prod
```

Or push to the `master` branch — CI will deploy automatically.

---

## 12. Verify Production

| Resource    | URL                                        |
| ----------- | ------------------------------------------ |
| Web         | `https://blog.hmziq.rs`                    |
| API         | `https://blog.hmziq.rs/api/newsletter/*`   |
| Subscribe   | `POST /api/newsletter/subscribe`           |
| Unsubscribe | `POST /api/newsletter/unsubscribe`         |

> The API is served via the same domain as the web app through Cloudflare routes. There is no separate `*.workers.dev` URL in production.

---

## GitHub Secrets

Add these to your repository secrets for CI deploys:

| Secret                   | Used By               |
| ------------------------ | --------------------- |
| `CLOUDFLARE_API_TOKEN`   | All deploys           |
| `CLOUDFLARE_ACCOUNT_ID`  | All deploys           |
| `R2_ACCOUNT_ID`          | Media upload          |
| `R2_ACCESS_KEY_ID`       | Media upload          |
| `R2_SECRET_ACCESS_KEY`   | Media upload          |
| `R2_BUCKET_NAME`         | Media upload          |
| `R2_PUBLIC_URL`          | Media upload + deploy |
| `SITE_URL`               | Newsletter workflow   |
| `NEWSLETTER_SEND_SECRET` | Newsletter workflow   |

---

## Architecture Note

Newsletter delivery is handled asynchronously via **Cloudflare Queues**:

- The `/send` endpoint enqueues messages in batches.
- `apps/api/src/modules/newsletter/queue-consumer.ts` processes the queue and calls `sendMail()` for each subscriber.
- Failed messages are retried automatically (default: 3 retries) and routed to the dead letter queue (`newsletter-dlq`) after exceeding the limit.
- Rate limiting is handled via D1 (`rate_limits` table) — no KV namespace is needed.

---

## Related Files

- `apps/api/wrangler.toml` — Cloudflare Workers config
- `apps/api/migrations/0001_initial.sql` — Database schema
- `apps/api/src/modules/newsletter/` — API endpoints (subscribe, unsubscribe, send) + queue consumer
- `apps/api/src/lib/mailer.ts` — `send_email` binding wrapper
- `apps/api/src/lib/rate-limit.ts` — D1-based rate limiting
- `apps/web/src/components/NewsletterForm.astro` — Subscription form
- `apps/web/src/components/NewsletterModal.astro` — Scroll modal
- `scripts/send-newsletter.ts` — Newsletter trigger script (calls Worker endpoint)
- `.github/workflows/send-newsletter.yml` — CI/CD workflow
