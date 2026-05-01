# Newsletter System Setup & Testing

## Prerequisites

- Cloudflare account with Workers Paid plan (for Email Routing + Email Sending)

## Setup Steps

### 1. Create D1 Databases

```bash
bun run db:create         # Production
bun run db:create:staging # Staging
```

Copy the `database_id` from each output into `apps/api/wrangler.toml`.

### 2. Run Migrations

```bash
bun run db:migrate:local  # Local (miniflare SQLite)
bun run db:migrate:prod   # Production
bun run db:migrate:staging
```

### 3. Enable Cloudflare Email Routing

1. Go to https://dash.cloudflare.com/
2. Navigate to Email → Email Routing
3. Verify your domain (hmziq.rs)
4. Add `newsletter@hmziq.rs` as a verified sender in Email → Email Sending

### 4. Set Up Cloudflare Turnstile

1. Go to https://dash.cloudflare.com/
2. Navigate to Turnstile
3. Create a new site
4. Copy site key and secret key

### 5. Configure Environment Variables

**Development (.env.development):**

```
EMAIL_FROM_ADDRESS=newsletter@hmziq.rs
NEWSLETTER_SEND_SECRET=<random-secret>
TURNSTILE_SECRET_KEY=<turnstile-secret-key>
PUBLIC_TURNSTILE_SITE_KEY=<turnstile-site-key>
```

**GitHub Secrets (for production):**

- `SITE_URL` (e.g. `https://hmziq.rs`)
- `NEWSLETTER_SEND_SECRET`
- `TURNSTILE_SECRET_KEY`
- `TURNSTILE_SITE_KEY`

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

### Production Deployment

1. Push to `master` — CI deploys both Pages and Worker
2. Newsletter workflow fires only when a post changes under `content/posts/`
3. Ensure GitHub Secrets are set before first deploy

## Architecture Note

Newsletter delivery is handled asynchronously via **Cloudflare Queues**:
- The `/send` endpoint enqueues messages in batches.
- `apps/api/src/modules/newsletter/queue-consumer.ts` processes the queue and calls `sendMail()` for each subscriber.
- This replaces the earlier direct-sending approach and provides better reliability and throughput.

## Files

- `apps/api/wrangler.toml` - Cloudflare Workers config
- `apps/api/migrations/0001_initial.sql` - Database schema
- `apps/api/src/modules/newsletter/` - API endpoints (subscribe, unsubscribe, send) + queue consumer
- `apps/api/src/lib/mailer.ts` - `send_email` wrapper
- `apps/web/src/components/NewsletterForm.astro` - Subscription form
- `apps/web/src/components/NewsletterModal.astro` - Scroll modal
- `scripts/send-newsletter.ts` - Newsletter trigger script (calls Worker endpoint)
- `.github/workflows/send-newsletter.yml` - CI/CD workflow
