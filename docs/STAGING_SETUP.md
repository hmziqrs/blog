# Staging Environment Setup

Complete checklist for setting up the **staging** environment. Every resource is isolated from production.

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

## 3. Create Staging R2 Bucket

```bash
wrangler r2 bucket create blog-media-staging
```

Generate S3-compatible tokens:

1. Go to https://dash.cloudflare.com
2. **Storage & databases → R2 → Overview → Manage R2 API Tokens**
3. Click **Create Account API token**
4. Set:
   - **Token name**: e.g. `blog-staging-media`
   - **Permissions**: Object Read & Write
   - **Specify bucket(s)**: select **blog-media-staging** only
5. Click **Create API token**
6. Copy both values immediately (secret key is shown once):
   - **Access Key ID** → `R2_ACCESS_KEY_ID`
   - **Secret Access Key** → `R2_SECRET_ACCESS_KEY`
7. The S3 endpoint on the confirmation page contains your account ID: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` → that's `R2_ACCOUNT_ID`

Enable public access:
1. **R2 object storage** → select **blog-media-staging** → **Settings**
2. Under **Public Development URL**, select **Enable**
3. Type `allow` to confirm, select **Allow**
4. Copy the **Public Bucket URL** shown — this is `R2_PUBLIC_URL`

Variables needed:
```
R2_ACCOUNT_ID=<from-dashboard-url>
R2_ACCESS_KEY_ID=<from-token>
R2_SECRET_ACCESS_KEY=<from-token>
R2_BUCKET_NAME=blog-media-staging
R2_PUBLIC_URL=<r2-dev-or-custom-url>
```

---

## 4. Enable Cloudflare Email Routing

1. Go to https://dash.cloudflare.com/
2. Navigate to **Email → Email Routing**
3. Verify your domain
4. Add both addresses as **destination addresses** under **Email Routing → Destination addresses**:
   - `newsletter@<your-domain>` (production)
   - `newsletter-staging@<your-domain>` (staging)

---

## 5. Set Up Cloudflare Turnstile

1. Go to https://dash.cloudflare.com/
2. Navigate to **Turnstile**
3. Create a new site (e.g. `blog-staging`)
4. Copy the **site key** and **secret key**

---

## 6. Configure Environment Variables

### Worker Secrets (via `wrangler secret put`)

```bash
wrangler secret put TURNSTILE_SECRET_KEY --env staging
# → paste the staging Turnstile secret key
wrangler secret put NEWSLETTER_SEND_SECRET --env staging
# → generate a random secret (e.g. openssl rand -hex 32)
wrangler secret put EMAIL_FROM_ADDRESS --env staging
# → newsletter-staging@<your-domain>
```

### Worker Vars (in `wrangler.toml` `env.staging.vars`)

Already configured — `ENVIRONMENT`, `ALLOWED_ORIGIN`, `SITE_URL`.

### Media Upload (local shell / CI)

```
R2_BUCKET_NAME=blog-media-staging
```

Set in shell before running `bun run media:upload`, or as a GitHub Secret for CI.

### Astro Build-Time Vars

```
PUBLIC_TURNSTILE_SITE_KEY=<staging-turnstile-site-key>
```

Set in your local `.env` before running `bun run deploy:web:staging`, or in the Astro build environment.

---

## 7. Create Staging Pages Project

Dashboard → **Pages → Create project**:

- **Project name**: `web-staging`
- **Production branch**: `staging`

Or deploy the first time via CLI:

```bash
bun run deploy:web:staging
```

---

## 8. Run Staging Migrations

```bash
bun run db:migrate:staging
```

---

## 9. Deploy to Staging

```bash
bun run deploy:staging
```

Or push to the `staging` branch — CI will deploy automatically.

---

## 10. Verify Staging

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
