# Production Environment Setup

Complete checklist for setting up the **production** environment. Every resource is isolated from staging.

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
| Workers KV Storage | Edit   |

### Zone-level permission (select "Zone" dropdown)

| Permission     | Access | Resource   |
| -------------- | ------ | ---------- |
| Workers Routes | Edit   | `hmziq.rs` |

> "Workers Routes" is a **Zone-level** permission — it won't appear under Account. Switch the dropdown from "Account" to "Zone" to find it.

---

## 1. Create Production D1 Database

```bash
wrangler d1 create blog-db
```

Copy the `database_id` into `apps/api/wrangler.toml` under `[[d1_databases]]`.

---

## 2. Create Production KV Namespace

Rate limiting uses Cloudflare Workers KV with TTL-based expiry.

```bash
wrangler kv namespace create RATE_LIMIT_KV
```

Copy the returned `id` into `apps/api/wrangler.toml` under `[[kv_namespaces]]`.

> Also create a preview namespace for local development:
>
> ```bash
> wrangler kv namespace create RATE_LIMIT_KV --preview
> ```
>
> Copy the returned `id` as `preview_id` in the same block. Without `preview_id`, `wrangler dev` writes to the production namespace.

---

## 3. Create Production Queues

The main queue and its dead letter queue (DLQ) must both be created:

```bash
wrangler queues create newsletter-send
wrangler queues create newsletter-dlq
```

Messages that fail after max retries are automatically routed to the DLQ instead of being deleted.

> The DLQ is auto-created if it doesn't exist when the consumer is deployed. Creating it explicitly ensures it's ready upfront.

---

## 4. Create Production R2 Bucket

```bash
wrangler r2 bucket create blog-media
```

Generate S3-compatible tokens:

1. Go to https://dash.cloudflare.com
2. **R2 → Manage R2 API Tokens**
3. Click **Create API token**
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

1. **R2** → select **blog-media** → **Settings**
2. Under **Custom Domains**, select **Add** to connect your domain (e.g. `media.yourdomain.com`)
3. Alternatively, under **R2.dev subdomain**, select **Allow access**, type `allow` to confirm
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

## 5. Enable Cloudflare Email Routing

The newsletter is outbound-only (no-reply). You only need Email Routing enabled on the zone — no custom addresses or destination verification required.

1. In the Cloudflare dashboard, go to **Email Routing** (sidebar or `https://dash.cloudflare.com/?to=/:account/:zone/email/routing`)
2. Review the DNS records that will be added to your zone, then select **Add records and enable**
3. Cloudflare auto-adds the required MX and TXT DNS records

> If you already enabled Email Routing for staging, skip this step — it's already active on the domain.

> The `EMAIL_FROM_ADDRESS` secret (set in step 6) determines the sender address. It must use a domain with Email Routing enabled.

---

## 6. Set Up Cloudflare Turnstile

1. Go to https://dash.cloudflare.com/
2. Navigate to **Turnstile**
3. Select **Add widget**
4. Set widget name (e.g. `blog-prod`) and hostname (e.g. `blog.hmziq.rs`)
5. Copy the **site key** and **secret key**

---

## 7. Configure Environment Variables

### Worker Secrets (via `wrangler secret put`)

These are encrypted in Cloudflare — never stored in files.

```bash
wrangler secret put TURNSTILE_SECRET_KEY --env=""  --config apps/api/wrangler.toml
# → paste your production Turnstile secret key (from step 5)
wrangler secret put NEWSLETTER_SEND_SECRET --env=""  --config apps/api/wrangler.toml
# → generate a random secret (e.g. openssl rand -hex 32)
wrangler secret put EMAIL_FROM_ADDRESS --env=""  --config apps/api/wrangler.toml
# → no-reply@<your-domain> (must use a domain with Email Routing enabled)
```

### Worker Vars (in `wrangler.toml` `[vars]`)

Already configured — no action needed.

| Variable         | Value                   |
| ---------------- | ----------------------- |
| `ENVIRONMENT`    | `production`            |
| `ALLOWED_ORIGIN` | `https://blog.hmziq.rs` |
| `SITE_URL`       | `https://blog.hmziq.rs` |

### Local `.env` (for manual deploys from your machine)

Set these in your `.env` file before running `bun run deploy:prod`:

```bash
# ─── Shared (same for staging and prod) ───────────────────
CLOUDFLARE_ACCOUNT_ID=f05ef21f6ee2c5e0d688d6358bcd47f6
CLOUDFLARE_API_TOKEN=<your-api-token>
R2_ACCOUNT_ID=<same-as-cloudflare-account-id>

# ─── Production-specific ──────────────────────────────────
R2_ACCESS_KEY_ID=<prod-r2-token>
R2_SECRET_ACCESS_KEY=<prod-r2-token>
R2_BUCKET_NAME=blog-media
R2_PUBLIC_URL=<prod-r2-or-custom-domain-url>

# ─── Astro build-time ─────────────────────────────────────
PUBLIC_TURNSTILE_SITE_KEY=<your-prod-turnstile-site-key>

# ─── Optional ──────────────────────────────────────────────
# Firebase vars (PUBLIC_FIREBASE_*) — skip if not using analytics
```

> `PUBLIC_SITE_URL` is set inline by the `deploy:web:prod` script in `package.json` — don't set it in `.env`.

Also update `site.config.ts` and any domain-specific URLs.

---

## 8. Configure Custom Domain Routes

Production uses custom domain routes. The routes are already configured in `wrangler.toml`:

```toml
[[routes]]
pattern = "blog.hmziq.rs/api/newsletter/*"
zone_name = "hmziq.rs"
```

When routes are set, `workers_dev` is automatically inferred as `false` — no separate `*.workers.dev` subdomain is created.

If using a different domain, update the pattern accordingly.

---

## 9. Create Production Pages Project

Dashboard → **Pages → Create project**:

- **Project name**: `hmziqblog`
- **Production branch**: `master`

Or deploy the first time via CLI:

```bash
bun run deploy:web:prod
```

> This is the single Pages project for both production and staging. Pushing to the `staging` branch creates a preview deployment at `staging.hmziqblog.pages.dev` — no separate project needed.

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

Push to `master` — CI deploys staging unconditionally, then deploys production web when `content/**` changes, and production API when a new `changelog/v*.md` is added. See [CI/CD Plan](./CICD_PLAN.md) for the full gating logic.

---

## 12. Verify Production

| Resource    | URL                                      |
| ----------- | ---------------------------------------- |
| Web         | `https://blog.hmziq.rs`                  |
| API         | `https://blog.hmziq.rs/api/newsletter/*` |
| Subscribe   | `POST /api/newsletter/subscribe`         |
| Unsubscribe | `POST /api/newsletter/unsubscribe`       |

> The API is served via the same domain as the web app through Cloudflare routes. There is no separate `*.workers.dev` URL in production.

---

## GitHub Actions Configuration

CI uses **GitHub Environments** (`stage` / `prod`) — create both at **Settings → Environments**. Two types: **Secrets** (encrypted, redacted in logs) for sensitive values, **Variables** (plaintext) for everything else. See [Staging Setup](./STAGING_SETUP.md) for the full table including `stage` values.

### Secrets

| Secret                   | Scope | Value                                              |
| ------------------------ | ----- | -------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`   | repo  | Your Cloudflare API token                          |
| `R2_ACCESS_KEY_ID`       | prod  | R2 token scoped to `blog-media`                    |
| `R2_SECRET_ACCESS_KEY`   | prod  | R2 token scoped to `blog-media`                    |
| `NEWSLETTER_SEND_SECRET` | prod  | Secret used to authenticate `/api/newsletter/send` |

### Variables

| Variable                          | Scope | Value                                      |
| --------------------------------- | ----- | ------------------------------------------ |
| `CLOUDFLARE_ACCOUNT_ID`           | repo  | `f05ef21f6ee2c5e0d688d6358bcd47f6`         |
| `R2_ACCOUNT_ID`                   | repo  | Same as Cloudflare account ID              |
| `R2_BUCKET_NAME`                  | prod  | `blog-media`                               |
| `R2_PUBLIC_URL`                   | prod  | Your production R2 public URL              |
| `PUBLIC_TURNSTILE_SITE_KEY`       | prod  | Your real Turnstile site key               |
| `SITE_URL`                        | prod  | `https://blog.hmziq.rs` (API Worker + scripts — not to be confused with `PUBLIC_SITE_URL` which is hardcoded inline in `deploy:web:prod` in `package.json`) |
| `D1_DATABASE_ID`                  | prod  | `66bfbc09-3aa2-4ede-88d3-4e06f280d2bb`    |
| `PUBLIC_FIREBASE_API_KEY`         | prod  | From Firebase console                      |
| `PUBLIC_FIREBASE_AUTH_DOMAIN`     | prod  | `<project>.firebaseapp.com`                |
| `PUBLIC_FIREBASE_PROJECT_ID`      | prod  | Firebase project ID                        |
| `PUBLIC_FIREBASE_STORAGE_BUCKET`  | prod  | `<project>.appspot.com`                    |
| `PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | prod | Firebase messaging sender ID             |
| `PUBLIC_FIREBASE_APP_ID`          | prod  | Firebase app ID                            |
| `PUBLIC_FIREBASE_MEASUREMENT_ID`  | prod  | Firebase measurement ID                    |

---

## Architecture Note

Newsletter delivery is handled asynchronously via **Cloudflare Queues**:

- The `/send` endpoint enqueues messages in batches.
- `apps/api/src/modules/newsletter/queue-consumer.ts` processes the queue and calls `sendMail()` for each subscriber.
- Failed messages are retried automatically (default: 3 retries) and routed to the dead letter queue (`newsletter-dlq`) after exceeding the limit.
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
