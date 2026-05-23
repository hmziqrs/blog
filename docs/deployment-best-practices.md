# Astro Blog Deployment Best Practices

This document catalogs the performance, SEO, and CI/CD practices used to deploy the Astro 6 blog to Cloudflare Pages. Newsletter, API deployment, and general Cloudflare deployment topics are excluded.

---

## 1. Performance Optimizations

### 1.1 Static Site Generation (SSG)

Every page is pre-rendered at build time with `output: "static"` in `apps/web/astro.config.ts`. This means:

- Zero server-side processing at request time — Cloudflare's edge CDN serves pre-built HTML files directly
- All dynamic routes (`/posts/[...slug]`, `/category/[category]`, `/tags/[tag]`, pagination) are enumerated via `getStaticPaths()` and generated as static files
- JSON API endpoints (`/api/*.json`) are also pre-rendered — no server round-trips for data

### 1.2 Image Loading Strategy

**Priority loading for LCP elements:**
- First post in any list gets `loading="eager"` and `fetchpriority="high"` (`PostList.astro`)
- Post cover images in article view are loaded eagerly (`PostLayout.astro`)
- All other images default to `loading="lazy"` (`ThemedImage.astro`)

**Layout shift prevention:**
- Every `<img>` has explicit `width` and `height` attributes sourced from a `media-manifest.json` file (`utils/cover-image.ts`)
- Fallback dimensions of `1280x720` when manifest data is missing

**GPU-accelerated animations:**
- PostCard hover effects use `will-change-transform` to promote elements to their own compositor layer
- `requestAnimationFrame` is used for all JS animations (modal open/close, consent banner, canvas banner)

### 1.3 Font Strategy

No custom web fonts are loaded. The site uses Tailwind's system font stack exclusively:

- Zero font download overhead
- Zero FOUT (Flash of Unstyled Text) / FOIT (Flash of Invisible Text)
- Text renders immediately on page load
- Monospace system stack used for code and decorative elements

### 1.4 CSS & Rendering

- **Tailwind v4** via `@tailwindcss/vite` — CSS-native engine, no PostCSS overhead, automatic unused CSS elimination
- **DaisyUI 5** with `--depth: 0` — removes all box-shadows from the theme system
- **Global zero box-shadow policy:** `:where(*, *::before, *::after) { box-shadow: none !important; }` eliminates paint complexity from shadows
- **`text-rendering: optimizeLegibility`** on body for improved text rendering
- **`-webkit-font-smoothing: antialiased`** via Tailwind's `antialiased` utility on body

### 1.5 JavaScript Minimization

Astro ships zero JS by default — components compile to static HTML. JavaScript is only shipped for interactive elements:

| Script | Loading Strategy | Trigger |
|--------|-----------------|---------|
| Theme toggle | Inline `<script>` | Synchronous, blocks render (prevents FOUC) |
| Firebase Analytics | Bundled `<script>` | Only loaded when env var is set AND user consents |
| Cloudflare Turnstile | Dynamic `createElement('script')` | Only when newsletter modal opens |
| ThreeJS banner (667KB) | Dynamic `createElement('script')` | Only when 3D banner is rendered |
| Consent banner | Inline `<script>` | Present but lightweight |

### 1.6 Client-Side Navigation

`<ClientRouter />` (Astro 6's View Transitions replacement) enables SPA-like navigation:

- Subsequent page loads fetch only the diff, not a full HTML document
- Theme state is synchronized across transitions via `astro:after-swap` and `astro:page-load` events
- No full page reload for internal navigation

### 1.7 Icon Delivery

`astro-icon` with `@iconify-json/tabler` inlines SVG icons directly into HTML:

- No external icon font requests
- Icons are tree-shaken during build — only used icons are included
- `ssr.noExternal` ensures icon data is available during static generation

### 1.8 Content Delivery

Cloudflare Pages global CDN provides:

- Edge caching for all static assets
- Automatic HTTP/2 and HTTP/3 support
- Brotli and gzip compression
- `public/_headers` applies security headers and caching policies globally

### 1.9 PWA Support

A `site.webmanifest` is present for "Add to Home Screen" capability with:
- Theme and background color matching the dark theme (`#0a0a0f`)
- `display: standalone` mode
- 192x192 and 512x512 icon sizes

No service worker is registered — the site does not implement offline caching.

---

## 2. SEO Optimizations

### 2.1 Meta Tags & Open Graph

Every page includes comprehensive meta tags (`BaseLayout.astro`):

| Tag | Value |
|-----|-------|
| `<title>` | Formatted via `formatPageTitle()` helper |
| `<meta name="description">` | Per-page description |
| `<link rel="canonical">` | Absolute URL derived from `Astro.url` + `Astro.site` |
| `<meta name="robots">` | `index, follow, max-image-preview:large` (or `noindex, nofollow` for special pages) |
| `og:type` | `website` or `article` |
| `og:url`, `og:site_name`, `og:title`, `og:description` | Always present |
| `og:image` | Cover image or default OG image |
| `og:image:width` / `og:image:height` | `1200` x `630` (explicit for social platform previews) |
| `og:locale` | `en_US` |
| `article:published_time` / `article:modified_time` | For article pages |

### 2.2 Twitter Cards

Full Twitter card support:

- `twitter:card` = `summary_large_image`
- `twitter:title`, `twitter:description`, `twitter:image`
- `twitter:site` and `twitter:creator` auto-extracted from site config socials

### 2.3 Structured Data (JSON-LD)

Post pages include `BlogPosting` schema (`PostLayout.astro`):

```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "...",
  "description": "...",
  "datePublished": "...",
  "dateModified": "...",
  "mainEntityOfPage": "...",
  "url": "...",
  "image": "...",
  "inLanguage": "en-US",
  "author": { "@type": "Person", "name": "..." },
  "publisher": { "@type": "Organization", "name": "..." },
  "isPartOf": { "@type": "Blog", "name": "..." }
}
```

Rendered via a generic `<StructuredData>` component that accepts any JSON-LD schema.

### 2.4 Sitemap

`@astrojs/sitemap` integration generates:

- `sitemap-index.xml` with per-page sitemaps
- Referenced in `robots.txt` via full absolute URL

### 2.5 robots.txt

Dynamically generated (`pages/robots.txt.ts`):

```
User-agent: *
Allow: /
Disallow: /api/
Sitemap: https://blog.hmziq.rs/sitemap-index.xml
```

API endpoints also receive `X-Robots-Tag: noindex` via `_headers`.

### 2.6 RSS Feed

`@astrojs/rss` generates an Atom-compatible feed at `/rss.xml`:

- Includes all non-draft posts sorted by date descending
- Self-referencing `<atom:link>` for feed discovery
- `<link rel="alternate" type="application/rss+xml">` in every page's `<head>`

### 2.7 Search Engine Verification

- Yandex verification meta tag present in `<head>`
- No Google Search Console verification meta tag visible in code (may be configured via DNS)

### 2.8 Semantic HTML

- Proper heading hierarchy: single `<h1>` per page, `<h2>` for sections
- `<article>` element wraps post content
- `<time datetime="...">` elements with ISO 8601 dates
- `<nav>` and `<main>` landmarks
- `rel="noopener noreferrer"` on all external links

### 2.9 Accessibility

- All images require `alt` text via component props
- Theme toggle uses `aria-label`, `aria-pressed`, and `title` attributes
- Social links have `aria-label` with platform name
- Keyboard-accessible post card navigation (entire card is clickable)

---

## 3. Security Headers

Applied globally via `public/_headers` (Cloudflare Pages):

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Frame-Options` | `DENY` | Prevents clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disables unused browser APIs |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | 2-year HSTS with preload list |
| `Content-Security-Policy` | Restrictive policy | Scripts from `self` + whitelisted Cloudflare/Firebase domains only |

API routes (`/api/*`) additionally get `X-Robots-Tag: noindex`.

---

## 4. GitHub Actions CI/CD

### 4.1 Workflow: `ci.yml`

**Triggers:**
- Push to `master`
- Pull requests (any branch)
- Manual `workflow_dispatch` with deploy toggles

**Concurrency:**
- Grouped by git ref (`deploy-${{ github.ref }}`)
- `cancel-in-progress: false` — deployments always complete, never cancelled

### 4.2 Pipeline Stages

```
qa
 |
 +---> detect (master push only)
 |       |
 +---> deploy-staging (master push or manual)
         |
         +---> deploy-web-prod (if release/content detected or manual)
         |
         +---> deploy-api-prod (if release detected or manual)
```

### 4.3 QA Job

Runs on every push and PR. Steps in order:

1. **Checkout** (`actions/checkout@v4`)
2. **Node 22** (`actions/setup-node@v4`)
3. **Bun** (`oven-sh/setup-bun@v2`)
4. **Install** (`bun install`)
5. **Lint** (`oxlint` via `bun run lint`)
6. **Format check** (`oxfmt --check` via `bun run fmt:check`)
7. **Astro type check** (`turbo -F web check` — runs `astro check`)
8. **Tests** (`turbo test && bun test scripts/__tests__`)

### 4.4 Change Detection

Runs only on master push. Uses `dorny/paths-filter@v3` to detect:

- **Release**: New `changelog/v*.md` files added
- **Content**: Any changes under `content/**`

These outputs gate production deployments.

### 4.5 Staging Deployment

Deploys on every master push. Steps:

1. Install dependencies
2. Upload media to R2 (staging bucket)
3. Remove stale Cloudflare Queue consumers
4. Run DB migrations + deploy API + deploy web via Turborepo

Uses GitHub Environment `stage` for secret scoping.

### 4.6 Production Web Deployment

Only triggers when:
- A release changelog is detected, OR
- Content files changed, OR
- Manually triggered via `workflow_dispatch`

Steps:

1. Run production DB migrations
2. Upload production media to R2
3. Build with `PUBLIC_SITE_URL=https://blog.hmziq.rs` and content directory from media pipeline
4. Deploy via `wrangler pages deploy apps/web/dist --project-name=hmziqblog --branch=master`

Uses GitHub Environment `prod` for secret scoping. Firebase production keys are only available in this environment.

### 4.7 Turborepo Configuration

`turbo.json` defines the build pipeline:

| Task | Cache | Notes |
|------|-------|-------|
| `build` / `build:staging` / `build:prod` | Cached | Invalidation keyed on 12 env vars |
| `check-types` | Cached | Depends on upstream type builds |
| `check` | Cached | Depends on `^build` |
| `dev` | **Uncached** | Persistent, never cached |
| `test` | **Uncached** | Always runs fresh |

All build variants invalidate cache when any of these env vars change: `PUBLIC_SITE_URL`, `CONTENT_DIR`, `R2_PUBLIC_URL`, Firebase keys, etc.

### 4.8 Manual Deploy Shortcuts

Root `package.json` provides CLI shortcuts:

```bash
bun run ci:staging     # gh workflow run ci.yml -f deploy-staging=true
bun run ci:web-prod    # gh workflow run ci.yml -f deploy-web-prod=true
bun run ci:api-prod    # gh workflow run ci.yml -f deploy-api-prod=true
```

---

## 5. Theme & UX

- **Dark-first design** with light mode support via DaisyUI themes
- **Zero FOUC**: Theme applied synchronously via inline `<script>` in `<head>` before body renders, reading from `localStorage`
- **Theme-aware favicons**: Dark/light SVG favicon swapped via JS
- **Consent-gated analytics**: Firebase only initializes after explicit user consent, stored in `localStorage`
- **Light mode warning**: Dismissible modal when switching to light mode (dismiss state persisted)
- **Newsletter modal**: Only shows after 50% scroll depth; Turnstile CAPTCHA only loaded when modal opens

---

## 6. Build Toolchain

| Tool | Version | Purpose |
|------|---------|---------|
| Astro | 6 | Static site generator |
| Tailwind CSS | v4 | Utility-first CSS via `@tailwindcss/vite` |
| DaisyUI | 5 | Component themes (dark/light) |
| oxlint | Latest | Fast linting |
| oxfmt | Latest | Code formatting |
| Turborepo | Latest | Monorepo build orchestration |
| Bun | Latest | Runtime, package manager, test runner |
| Wrangler | Latest | Cloudflare Pages/Workers deployment |
| Zod | 4 | Content collection schema validation |
