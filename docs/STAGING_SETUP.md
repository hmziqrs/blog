# Staging Environment Setup

Complete checklist for setting up the **staging** environment.

> **One-time setup:** Some steps (R2 bucket, Email Routing, Turnstile) are shared across environments and only need to be done once per account/domain. These are marked below.

---

## Prerequisites

- Cloudflare account with domain added
- `wrangler` CLI installed and authenticated (`wrangler login`)
- R2 plan enabled (free tier ok)

---

## 1. Create Staging D1 Database

```bash
wrangler d1 create blog-db-staging
```

Copy the `database_id` into `apps/api/wrangler.toml` under `[[env.staging.d1_databases]]`.

---

## 2. Create Staging Queues

The main queue and its dead letter queue (DLQ) must both be created explicitly:

```bash
wrangler queues create newsletter-send-staging
wrangler queues create newsletter-dlq-staging
```

Messages that fail after max retries are automatically routed to the DLQ instead of being deleted.

---

## 3. Create R2 Bucket (One-Time)

```bash
wrangler r2 bucket create blog-media
```

> Only needs to be done once. Both environments share the same bucket.

Generate S3-compatible tokens in the Cloudflare dashboard (**R2 → Manage R2 API tokens**):

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME=blog-media`
- `R2_PUBLIC_URL` — use the `*.r2.dev` URL (e.g. `https://pub-abc123.r2.dev`) or a custom domain (e.g. `https://media.yourdomain.com`). Custom domains serve objects at the root path, not under the bucket name.

---

## 4. Set Staging Worker Secrets

```bash
wrangler secret put TURNSTILE_SECRET_KEY --env staging
wrangler secret put NEWSLETTER_SEND_SECRET --env staging
wrangler secret put EMAIL_FROM_ADDRESS --env staging
```

---

## 5. Enable Cloudflare Email Routing (One-Time)

1. Go to https://dash.cloudflare.com/
2. Navigate to **Email → Email Routing**
3. Verify your domain
4. Add `newsletter@<your-domain>` as a **destination address** under **Email Routing → Destination addresses**

> Only needs to be done once per domain.

---

## 6. Set Up Cloudflare Turnstile

1. Go to https://dash.cloudflare.com/
2. Navigate to **Turnstile**
3. Create a new site (e.g. `blog-staging`)
4. Copy the **site key** and **secret key**

> Cloudflare recommends creating separate widgets per environment (e.g. `blog-prod` and `blog-staging`) for independent analytics and configuration.

---

## 7. Configure Environment Variables

Create `.env.staging`:

```
EMAIL_FROM_ADDRESS=newsletter@<your-domain>
NEWSLETTER_SEND_SECRET=<random-secret>
TURNSTILE_SECRET_KEY=<turnstile-secret-key>
PUBLIC_TURNSTILE_SITE_KEY=<turnstile-site-key>
```

---

## 8. Create Staging Pages Project

Dashboard → **Pages → Create project**:

- **Project name**: `web-staging`
- **Production branch**: `staging`

Or deploy the first time via CLI:

```bash
bun run deploy:web:staging
```

---

## 9. Run Staging Migrations

```bash
bun run db:migrate:staging
```

---

## 10. Deploy to Staging

```bash
bun run deploy:staging
```

Or push to the `staging` branch — CI will deploy automatically.

---

## 11. Verify Staging

| Resource    | URL                                              |
| ----------- | ------------------------------------------------ |
| Web         | `https://web-staging.pages.dev`                  |
| API         | `https://api-staging.<account>.workers.dev`      |
| Subscribe   | `POST /api/newsletter/subscribe`                 |
| Unsubscribe | `POST /api/newsletter/unsubscribe`               |

> Staging uses the default `workers_dev` (enabled), so the API is accessible via `*.workers.dev` subdomain. This is intentionally different from production, which uses custom domain routes.

---

## Testing

### Local Development

```bash
bun run dev:web
```

- Visit http://localhost:4321
- Test modal (scroll to 50%)
- Test 7-day dismissal checkbox
- Test subscription form
- Check D1: `bun run db:query --command "SELECT * FROM subscribers"`

### Test API Endpoints

```bash
# Subscribe
curl -X POST http://localhost:4321/api/newsletter/subscribe \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","token":"<turnstile-token>"}'

# Unsubscribe
curl -X POST http://localhost:4321/api/newsletter/unsubscribe \
  -H "Content-Type: application/json" \
  -d '{"token":"<unsubscribe-token>"}'
```

### Test Newsletter Sending

```bash
# Requires NEWSLETTER_SEND_SECRET env var
NEWSLETTER_SEND_SECRET=your-secret bun run newsletter:send
```

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

---

## Architecture Note

Newsletter delivery is handled asynchronously via **Cloudflare Queues**:

- The `/send` endpoint enqueues messages in batches.
- `apps/api/src/modules/newsletter/queue-consumer.ts` processes the queue and calls `sendMail()` for each subscriber.
- Failed messages are retried automatically (default: 3 retries) and routed to the dead letter queue (`newsletter-dlq-staging`) after exceeding the limit.
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
