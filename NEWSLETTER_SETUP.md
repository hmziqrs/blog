# Newsletter System Setup & Testing

## Prerequisites

- Cloudflare account with Workers Paid plan (for Email Sending)
- Cloudflare API token with D1 and Email Sending permissions

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

### 3. Set Up Cloudflare Turnstile

1. Go to https://dash.cloudflare.com/
2. Navigate to Turnstile
3. Create a new site
4. Copy site key and secret key

### 4. Configure Environment Variables

**Development (.env.development):**

```
CLOUDFLARE_ACCOUNT_ID=<your-account-id>
CLOUDFLARE_API_TOKEN=<your-api-token>
D1_DATABASE_ID=<your-dev-database-id>
EMAIL_FROM_ADDRESS=newsletter@blog.hmziq.rs
TURNSTILE_SITE_KEY=<turnstile-site-key>
TURNSTILE_SECRET_KEY=<turnstile-secret-key>
PUBLIC_TURNSTILE_SITE_KEY=<turnstile-site-key>
```

**GitHub Secrets (for production):**

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `D1_DATABASE_ID` (production ID)
- `EMAIL_FROM_ADDRESS`
- `TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`

### 5. Enable Cloudflare Email Sending

1. Go to Cloudflare dashboard
2. Navigate to Email → Email Sending
3. Verify your domain (blog.hmziq.rs)
4. Configure sending rules

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
# Add test subscriber to D1 first
bun run newsletter:send
```

### Database Queries

```bash
bun run db:query:dev --command "SELECT * FROM subscribers"
bun run db:query:dev --command "SELECT * FROM newsletter_sent"
bun run db:query:dev --command "SELECT * FROM blacklist"
bun run db:query:dev --command "SELECT * FROM rate_limits"
```

### Production Deployment

1. Push to main branch
2. Cloudflare Pages will auto-deploy
3. Newsletter workflow triggers after deployment
4. Add GitHub Secrets before deployment

## Database Schema

- `subscribers` - Email addresses and tokens
- `newsletter_sent` - Track which posts have been sent
- `blacklist` - Block abusive emails
- `rate_limits` - Prevent spam (3 requests/min per IP)

## Files

- `apps/web/wrangler.toml` - Cloudflare Workers config
- `apps/web/migrations/0001_initial.sql` - Database schema
- `apps/web/src/pages/api/newsletter/` - API endpoints
- `apps/web/src/components/NewsletterForm.astro` - Subscription form
- `apps/web/src/components/NewsletterModal.astro` - Scroll modal
- `scripts/send-newsletter.ts` - Newsletter sending script
- `.github/workflows/send-newsletter.yml` - CI/CD workflow
