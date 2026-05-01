# Production Environment Setup

Complete checklist for setting up the **production** environment. Every resource is isolated from staging.

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

## 3. Create Production R2 Bucket

```bash
wrangler r2 bucket create blog-media
```

Generate S3-compatible tokens:

1. Go to https://dash.cloudflare.com
2. **Storage & databases → R2 → Overview → Manage R2 API Tokens**
3. Click **Create Account API token**
4. Set:
   - **Token name**: e.g. `blog-prod-media`
   - **Permissions**: Object Read & Write
   - **Specify bucket(s)**: select **blog-media** only
5. Click **Create API token**
6. Copy both values immediately (secret key is shown once):
   - **Access Key ID** → `R2_ACCESS_KEY_ID`
   - **Secret Access Key** → `R2_SECRET_ACCESS_KEY`
7. The S3 endpoint on the confirmation page contains your account ID: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` → that's `R2_ACCOUNT_ID`

Enable public access:
1. **R2 object storage** → select **blog-media** → **Settings**
2. Under **Custom Domains**, select **Add** to connect your domain (e.g. `media.yourdomain.com`)
3. Alternatively, under **Public Development URL**, select **Enable**, type `allow` to confirm
4. Copy the **Public Bucket URL** shown — this is `R2_PUBLIC_URL`

Variables needed:
```
R2_ACCOUNT_ID=<from-dashboard-url>
R2_ACCESS_KEY_ID=<from-token>
R2_SECRET_ACCESS_KEY=<from-token>
R2_BUCKET_NAME=blog-media
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

> This step is shared with staging. If you already added both addresses during staging setup, skip this step.

---

## 5. Set Up Cloudflare Turnstile

1. Go to https://dash.cloudflare.com/
2. Navigate to **Turnstile**
3. Create a new site (e.g. `blog-prod`)
4. Copy the **site key** and **secret key**

---

## 6. Configure Environment Variables

### Worker Secrets (via `wrangler secret put`)

```bash
wrangler secret put TURNSTILE_SECRET_KEY
# → paste the production Turnstile secret key
wrangler secret put NEWSLETTER_SEND_SECRET
# → generate a random secret (e.g. openssl rand -hex 32)
wrangler secret put EMAIL_FROM_ADDRESS
# → newsletter@<your-domain>
```

### Worker Vars (in `wrangler.toml` `[vars]`)

Already configured — `ENVIRONMENT`, `ALLOWED_ORIGIN`, `SITE_URL`.

### Media Upload (local shell / CI)

```
R2_BUCKET_NAME=blog-media
```

Set in shell before running `bun run media:upload`, or as a GitHub Secret for CI.

### Astro Build-Time Vars

```
PUBLIC_TURNSTILE_SITE_KEY=<prod-turnstile-site-key>
```

Set in your local `.env` before running `bun run deploy:web:prod`, or in the Astro build environment.

Also update `site.config.ts` and any domain-specific URLs.

---

## 7. Configure Custom Domain Routes

Production uses `workers_dev = false` — the API is only accessible via custom domain routes. The routes are already configured in `wrangler.toml`:

```toml
routes = [
  { pattern = "blog.hmziq.rs/api/newsletter/*", zone_name = "hmziq.rs" }
]
```

If using a different domain, update the pattern accordingly. No `*.workers.dev` subdomain is available in production.

---

## 8. Create Production Pages Project

Dashboard → **Pages → Create project**:

- **Project name**: `web`
- **Production branch**: `master`

Or deploy the first time via CLI:

```bash
bun run deploy:web:prod
```

---

## 9. Run Production Migrations

```bash
bun run db:migrate:prod
```

---

## 10. Deploy to Production

```bash
bun run deploy:prod
```

Or push to the `master` branch — CI will deploy automatically.

---

## 11. Verify Production

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
