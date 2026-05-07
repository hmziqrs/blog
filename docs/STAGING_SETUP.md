# Staging Environment Setup

Complete checklist for setting up the **staging** environment. Every resource is isolated from production.

---

## Prerequisites

- Cloudflare account with domain added
- `wrangler` CLI installed and authenticated (`wrangler login`)
- R2 plan enabled (free tier ok)
- API token with the permissions below

---

## API Token Permissions

Create a token at **My Profile → API Tokens → Create Token** → start with "Create Custom Token".

### Account-level permissions (select "Account" dropdown)

| Permission         | Access |
| ------------------ | ------ |
| Workers Scripts    | Edit   |
| D1                 | Edit   |
| Cloudflare Pages   | Edit   |
| Queues             | Edit   |
| Workers R2 Storage | Edit   |

### Zone-level permission (select "Zone" dropdown)

| Permission     | Access | Resource   |
| -------------- | ------ | ---------- |
| Workers Routes | Edit   | `hmziq.rs` |

> "Workers Routes" is a **Zone-level** permission — it won't appear under Account. Switch the dropdown from "Account" to "Zone" to find it.

---

## 1. Create Staging D1 Database

```bash
wrangler d1 create blog-db-staging
```

Copy the `database_id` into `apps/api/wrangler.toml` under `[[env.staging.d1_databases]]`.

---

## 2. Create Staging KV Namespace

Rate limiting uses Cloudflare Workers KV with TTL-based expiry.

```bash
wrangler kv namespace create RATE_LIMIT_KV --env staging
```

Copy the returned `id` into `apps/api/wrangler.toml` under `[[env.staging.kv_namespaces]]`.

> Also create a preview namespace for local development:
>
> ```bash
> wrangler kv namespace create RATE_LIMIT_KV --preview
> ```
>
> Copy the returned `id` as `preview_id` in the top-level `[[kv_namespaces]]` block.

---

## 3. Create Staging Queues

The main queue and its dead letter queue (DLQ) must both be created:

```bash
wrangler queues create newsletter-send-staging
wrangler queues create newsletter-dlq-staging
```

Messages that fail after max retries are automatically routed to the DLQ instead of being deleted.

> The DLQ is auto-created if it doesn't exist when the consumer is deployed. Creating it explicitly ensures it's ready upfront.

---

## 4. Create Staging R2 Bucket

```bash
wrangler r2 bucket create blog-media-staging
```

Generate S3-compatible tokens:

1. Go to https://dash.cloudflare.com
2. **R2 → Manage R2 API Tokens**
3. Click **Create API token**
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

1. **R2** → select **blog-media-staging** → **Settings**
2. Under **R2.dev subdomain**, select **Allow access**
3. Type `allow` to confirm
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

## 5. Enable Cloudflare Email Routing

The newsletter is outbound-only (no-reply). You only need Email Routing enabled on the zone — no custom addresses or destination verification required.

1. In the Cloudflare dashboard, go to **Email Routing** (sidebar or `https://dash.cloudflare.com/?to=/:account/:zone/email/routing`)
2. Review the DNS records that will be added to your zone, then select **Add records and enable**
3. Cloudflare auto-adds the required MX and TXT DNS records

> The `EMAIL_FROM_ADDRESS` secret (set in step 6) determines the sender address. It must use a domain with Email Routing enabled.

---

## 6. Set Up Cloudflare Turnstile

Staging and local dev use Cloudflare's **test keys** — no dashboard widget needed. Test keys work on any domain (`localhost`, `*.workers.dev`, etc.) and always pass validation.

| Key        | Value                                 |
| ---------- | ------------------------------------- |
| Site key   | `1x00000000000000000000AA`            |
| Secret key | `1x0000000000000000000000000000000AA` |

Use these as `PUBLIC_TURNSTILE_SITE_KEY` (Astro) and `TURNSTILE_SECRET_KEY` (Worker secret).

> "Any Hostname" (which allows custom domains without pre-configuration) is Enterprise-only. Test keys are the official approach for non-production environments.
>
> Reference: <https://developers.cloudflare.com/turnstile/troubleshooting/testing>

---

## 7. Configure Environment Variables

### Worker Secrets (via `wrangler secret put --env staging`)

These are encrypted in Cloudflare — never stored in files.

```bash
wrangler secret put TURNSTILE_SECRET_KEY --env staging --config apps/api/wrangler.toml
# → 1x0000000000000000000000000000000AA (test key)
wrangler secret put NEWSLETTER_SEND_SECRET --env staging --config apps/api/wrangler.toml
# → generate a random secret (e.g. openssl rand -hex 32)
wrangler secret put EMAIL_FROM_ADDRESS --env staging --config apps/api/wrangler.toml
# → no-reply@<your-domain> (must use a domain with Email Routing enabled)
```

### Worker Vars (in `wrangler.toml` `env.staging.vars`)

Already configured — no action needed.

| Variable         | Value                                 |
| ---------------- | ------------------------------------- |
| `ENVIRONMENT`    | `staging`                             |
| `ALLOWED_ORIGIN` | `https://staging.hmziqblog.pages.dev` |
| `SITE_URL`       | `https://staging.hmziqblog.pages.dev` |

### Local `.env` (for manual deploys from your machine)

Set these in your `.env` file before running `bun run deploy:staging`:

```bash
# ─── Shared (same for staging and prod) ───────────────────
CLOUDFLARE_ACCOUNT_ID=f05ef21f6ee2c5e0d688d6358bcd47f6
CLOUDFLARE_API_TOKEN=<your-api-token>
R2_ACCOUNT_ID=<same-as-cloudflare-account-id>

# ─── Staging-specific ─────────────────────────────────────
R2_ACCESS_KEY_ID=<staging-r2-token>
R2_SECRET_ACCESS_KEY=<staging-r2-token>
R2_BUCKET_NAME=blog-media-staging
R2_PUBLIC_URL=<staging-r2-dev-url>

# ─── Astro build-time ─────────────────────────────────────
PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA

# ─── Optional ──────────────────────────────────────────────
# Firebase vars (PUBLIC_FIREBASE_*) — skip if not using analytics
```

> `PUBLIC_SITE_URL` is set inline by the deploy script — don't set it in `.env`.

---

## 8. Staging Pages Deployment

Staging uses the **same Pages project** as production (`hmziqblog`). The `staging` branch is deployed as a **preview deployment** — it gets a dedicated URL at `staging.hmziqblog.pages.dev` without affecting the production site.

No separate Pages project is needed. The first deploy via CLI creates the preview automatically:

```bash
bun run deploy:web:staging
```

> Preview deployments are a built-in Cloudflare Pages feature. Any branch that is not the production branch gets a unique preview URL. The `--branch=staging` flag in the deploy command creates a branch alias at `staging.hmziqblog.pages.dev`.

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

| Resource    | URL                                     |
| ----------- | --------------------------------------- |
| Web         | `https://staging.hmziqblog.pages.dev`   |
| API         | `https://api-staging.hmziq.workers.dev` |
| Subscribe   | `POST /api/newsletter/subscribe`        |
| Unsubscribe | `POST /api/newsletter/unsubscribe`      |

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

Add these to your repository secrets for CI staging deploys. Staging-specific secrets use the `STAGE_` prefix.

### Shared (used by both staging and prod)

| Secret                  | Value                              |
| ----------------------- | ---------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | Your Cloudflare API token          |
| `CLOUDFLARE_ACCOUNT_ID` | `f05ef21f6ee2c5e0d688d6358bcd47f6` |
| `R2_ACCOUNT_ID`         | Same as Cloudflare account ID      |

### Staging-only (prefixed with `STAGE_`)

| Secret                            | Value                                   |
| --------------------------------- | --------------------------------------- |
| `STAGE_R2_ACCESS_KEY_ID`          | R2 token scoped to `blog-media-staging` |
| `STAGE_R2_SECRET_ACCESS_KEY`      | R2 token scoped to `blog-media-staging` |
| `STAGE_R2_BUCKET_NAME`            | `blog-media-staging`                    |
| `STAGE_R2_PUBLIC_URL`             | Your staging R2 public URL              |
| `STAGE_PUBLIC_TURNSTILE_SITE_KEY` | `1x00000000000000000000AA` (test key)   |

---

## Architecture Note

Newsletter delivery is handled asynchronously via **Cloudflare Queues**:

- The `/send` endpoint enqueues messages in batches.
- `apps/api/src/modules/newsletter/queue-consumer.ts` processes the queue and calls `sendMail()` for each subscriber.
- Failed messages are retried automatically (default: 3 retries) and routed to the dead letter queue (`newsletter-dlq-staging`) after exceeding the limit.
- Rate limiting is handled via **Workers KV** (`RATE_LIMIT_KV` namespace) with TTL-based key expiry — no D1 table needed.

---

## Related Files

- `apps/api/wrangler.toml` — Cloudflare Workers config
- `apps/api/migrations/0001_initial.sql` — Database schema
- `apps/api/src/modules/newsletter/` — API endpoints (subscribe, unsubscribe, send) + queue consumer
- `apps/api/src/lib/mailer.ts` — `send_email` binding wrapper
- `apps/api/src/lib/rate-limit.ts` — KV-based rate limiting
- `apps/web/src/components/NewsletterForm.astro` — Subscription form
- `apps/web/src/components/NewsletterModal.astro` — Scroll modal
- `scripts/send-newsletter.ts` — Newsletter trigger script (calls Worker endpoint)
- `.github/workflows/send-newsletter.yml` — CI/CD workflow
