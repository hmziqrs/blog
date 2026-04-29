# Newsletter System Setup & Testing

## Prerequisites

- Cloudflare account with Workers Paid plan (for Email Routing + Email Sending)

## Setup Steps

### 1. Create D1 Databases

```bash
bun run db:create        # Creates blog-newsletter (production)
bun run db:create:dev    # Creates blog-newsletter-dev (development)
```

Copy the `database_id` from each output and add to `apps/web/wrangler.toml`:

- Production: `database_id = "<your-prod-id>"`
- Development: `database_id = "<your-dev-id>"`

### 2. Run Migrations

```bash
bun run db:migrate      # Production database
bun run db:migrate:dev  # Development database
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
- Check D1: `bun run db:query:dev --command "SELECT * FROM subscribers"`

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

### Database Queries

```bash
bun run db:query:dev --command "SELECT * FROM subscribers"
bun run db:query:dev --command "SELECT * FROM newsletter_sent"
bun run db:query:dev --command "SELECT * FROM newsletter_deliveries"
bun run db:query:dev --command "SELECT * FROM blacklist"
bun run db:query:dev --command "SELECT * FROM rate_limits"
bun run db:query:dev --command "SELECT * FROM media"
```

### Production Deployment

1. Push to main branch
2. Cloudflare Pages will auto-deploy
3. Newsletter workflow triggers after deployment
4. Add GitHub Secrets before deployment

## Database Schema

- `subscribers` - Email addresses, status, tokens
- `newsletter_sent` - Track which posts have been sent
- `newsletter_deliveries` - Per-recipient send status
- `blacklist` - Block abusive emails
- `rate_limits` - Prevent spam (3 requests/min per IP)
- `media` - Uploaded media metadata

## Files

- `apps/web/wrangler.toml` - Cloudflare Workers config
- `apps/web/migrations/0001_initial.sql` - Database schema
- `apps/web/src/pages/api/newsletter/` - API endpoints (subscribe, unsubscribe, send)
- `apps/web/src/lib/mailer.ts` - `send_email` wrapper
- `apps/web/src/components/NewsletterForm.astro` - Subscription form
- `apps/web/src/components/NewsletterModal.astro` - Scroll modal
- `scripts/send-newsletter.ts` - Newsletter trigger script (calls Worker endpoint)
- `.github/workflows/send-newsletter.yml` - CI/CD workflow
