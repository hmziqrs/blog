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

## 2. Create Staging KV Namespace

```bash
wrangler kv namespace create RATE_LIMIT_KV --env staging
```

Copy the `id` into `wrangler.toml` under `[[env.staging.kv_namespaces]]`.

---

## 3. Create Staging Queue

```bash
wrangler queues create newsletter-send-staging
```

---

## 4. Create R2 Bucket (One-Time)

```bash
wrangler r2 bucket create blog-media
```

> Only needs to be done once. Both environments share the same bucket.

Generate S3-compatible tokens in the Cloudflare dashboard and configure:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME=blog-media`
- `R2_PUBLIC_URL=https://<custom-or-r2-domain>/<bucket>`

---

## 5. Set Staging Worker Secrets

```bash
wrangler secret put TURNSTILE_SECRET_KEY --env staging
wrangler secret put NEWSLETTER_SEND_SECRET --env staging
wrangler secret put EMAIL_FROM_ADDRESS --env staging
```

---

## 6. Enable Cloudflare Email Routing (One-Time)

1. Go to https://dash.cloudflare.com/
2. Navigate to **Email → Email Routing**
3. Verify your domain
4. Add `newsletter@<your-domain>` as a verified sender in **Email → Email Sending**

> Only needs to be done once per domain.

---

## 7. Set Up Cloudflare Turnstile (One-Time)

1. Go to https://dash.cloudflare.com/
2. Navigate to **Turnstile**
3. Create a new site
4. Copy the **site key** and **secret key**

> The same Turnstile site can be used for both environments.

---

## 8. Configure Environment Variables

Create `.env.staging`:

```
EMAIL_FROM_ADDRESS=newsletter@<your-domain>
NEWSLETTER_SEND_SECRET=<random-secret>
TURNSTILE_SECRET_KEY=<turnstile-secret-key>
PUBLIC_TURNSTILE_SITE_KEY=<turnstile-site-key>
```

---

## 9. Create Staging Pages Project

Dashboard → **Pages → Create project**:

- **Project name**: `web-staging`
- **Production branch**: `staging`

Or deploy the first time via CLI:

```bash
bun run deploy:web:staging
```

---

## 10. Run Staging Migrations

```bash
bun run db:migrate:staging
```

---

## 11. Deploy to Staging

```bash
bun run deploy:staging
```

Or push to the `staging` branch — CI will deploy automatically.

---

## 12. Verify Staging

| Resource   | URL                                              |
| ---------- | ------------------------------------------------ |
| Web        | `https://web-staging.pages.dev`                  |
| API        | `https://api-staging.<account>.workers.dev`      |
| Newsletter | `POST /api/newsletter/subscribe`                 |

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
