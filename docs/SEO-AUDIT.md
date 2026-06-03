# SEO Audit Report -- blog.hmziq.rs (Post-Fix Audit)

**Date:** June 3, 2026
**Pages Crawled:** 17
**Previous Score:** 38 / 100 (June 2, 2026)
**Current Score:** 42 / 100 (+4)

---

## Executive Summary

The site improved from 38 to 42 -- a marginal gain driven by confirmation that previously implemented items (canonical URLs, robots meta, feed autodiscovery, structured data on the blog post) are working correctly. No critical issues from the June 2 audit were fixed in this window.

**What moved the score up:**
- RSS feed confirmed reachable at `/rss.xml` with valid XML (200 status)
- Feed autodiscovery `<link>` tags confirmed present on all HTML pages
- Canonical URLs confirmed present and correct on all HTML pages
- Robots meta tags confirmed present on all HTML pages
- Structured data confirmed on homepage (WebSite + Blog) and blog post (BlogPosting)
- 404 page confirmed correctly set to noindex/nofollow
- Internal linking structure healthy (12-34 internal links per page)
- Blog post has custom OG image (not generic SVG)

**What is still blocking progress:**
- 3 pages have no H1 tag (Homepage, About -- a regression, Contact)
- Every page title is too short (10-30 chars, need 50-60)
- Every meta description is too short (38-140 chars, need 150-160)
- Only 1 published blog post
- Atom feed returns 404 on live site
- Schema graph has no `@id` references -- entities are disconnected
- No BreadcrumbList schema on any page
- All non-post pages use generic SVG OG image

**Summary of all issues:**

| Severity | Count |
|---|---|
| Critical | 8 |
| High | 22 |
| Medium | 20 |
| Low | 15 |
| **Total** | **65** |

---

## Technical SEO

### robots.txt

| Status | Item | Detail |
|---|---|---|
| OK | Sitemap reference valid | Points to `https://blog.hmziq.rs/sitemap-index.xml`, returns 200 with correct content type |
| OK | `/api/` disallow correct | Defensive block for worker-served endpoints |
| Info | Missing `Crawl-delay` | No crawl delay set. Googlebot ignores it but Bingbot respects it. Add `Crawl-delay: 10`. |
| Info | No disallow for `/newsletter/unsubscribe` | Utility page that should not appear in search results. |
| Info | No disallow for `/changelog` or `/newsletter` | Form submission pages that do not need indexing. |

### Sitemap

| Status | Item | Detail |
|---|---|---|
| OK | 18 URLs listed | Covers homepage, about, advertise, categories, changelog, contact, newsletter, posts, privacy, tags, terms |
| Medium | No `<lastmod>` elements | All 18 entries lack lastmod dates. Search engines cannot determine content freshness. |
| Medium | Uppercase characters in URL | `/category/Engineering/` has uppercase `E`. Use lowercase and add 301 redirect. |
| Medium | Missing `<image:image>` extensions | Namespace declared but no image entries. Add for posts with images. |
| Info | Non-content pages in sitemap | Utility and legal pages included. Consider filtering via `@astrojs/sitemap` filter option. |
| Info | `Cache-Control: max-age=0, must-revalidate` | Could use longer cache for an infrequently-changing sitemap. |

### Security Headers

| Status | Header | Detail |
|---|---|---|
| High | Missing `Strict-Transport-Security` | No HSTS header. Enable via Cloudflare: `max-age=31536000; includeSubDomains; preload` |
| Medium | Missing `Content-Security-Policy` | No CSP header present. |
| Medium | Missing `X-Frame-Options` | Site can be embedded in iframes (clickjacking risk). |
| Low | Missing `Permissions-Policy` | Browser features like camera, microphone can be invoked by any script. |
| Low | CORS wildcard `*` | `access-control-allow-origin: *` is unnecessary for a static blog. |
| OK | `X-Content-Type-Options: nosniff` | Correct. |
| OK | `Referrer-Policy: strict-origin-when-cross-origin` | Correct. |
| OK | SSL certificate valid | Issued by Google Trust Services. TLS 1.2+ supported. HTTP redirects to HTTPS. |
| OK | No mixed content | All resource URLs use HTTPS or relative paths. |

### Feeds

| Status | Item | Detail |
|---|---|---|
| Critical | Atom feed returns 404 on live site | `/atom.xml` exists in source and dist but is not reachable. Verify Cloudflare Pages routing and ensure latest build is deployed. |
| Critical | Atom feed self link points to staging | Built `atom.xml` contains `https://staging.hmziqblog.pages.dev/atom.xml`. Ensure production build sets `PUBLIC_SITE_URL=https://blog.hmziq.rs`. |
| Warning | No `<content>` elements in Atom feed | Entries only have `<summary>`, no full/partial post body. |
| Warning | No `<author>` elements in feeds | RSS and Atom items lack author attribution. |
| Info | Atom feed entry summary is vague | "Third attempt at a blog" -- not keyword-rich. |
| OK | RSS feed at `/rss.xml` is valid | Returns 200, standard RSS 2.0. |
| OK | Autodiscovery links present in `<head>` | Both RSS and Atom linked in BaseLayout. |

### llms.txt

| Status | Item | Detail |
|---|---|---|
| High | URLs are relative paths | Live output shows `(/posts/vibe-coding-astro-cloudflare)` instead of absolute URLs. Verify `PUBLIC_SITE_URL` in production build. |
| Medium | Newsletters section missing from live output | Source defines it but live output ends after `## Info`. |
| Medium | No `llms-full.txt` endpoint | AI search engines prefer full content for citation. |
| Low | Site description is vague | "Writing about software engineering, tools, and ideas." -- not specific enough for LLM consumers. |

### URL Structure

| Status | Item | Detail |
|---|---|---|
| Medium | Inconsistent case | `/category/Engineering/` has uppercase `E`. |
| OK | URLs are clean and descriptive | `/posts/vibe-coding-astro-cloudflare`, `/about`, `/privacy`. |
| OK | Trailing slashes consistent | Pages use trailing slashes consistently. |
| OK | Important pages within 3 clicks | Homepage links reach all pages within 2-3 clicks. |

---

## On-Page SEO by Page

### Homepage (`/`) -- Score: 25/100

**Fixed since previous audit:** None of the issues are fixed.

| Severity | Issue | Evidence |
|---|---|---|
| Critical | No H1 tag | `h1` array is empty. Post card titles render as H2. |
| High | Title is 10 chars | `"Hmziq blog"` -- need 50-60. |
| High | Meta description is 53 chars | `"Writing about software engineering, tools, and ideas."` -- need 150-160. |
| Medium | OG image is SVG | `og-default.svg` -- social platforms may not render reliably. |
| Medium | Thin body content (~149 words) | Need 300+ for homepage authority. |
| Low | Post card H2 with no parent H1 | Heading hierarchy is empty then H2. |

### About (`/about`) -- Score: 30/100

**Fixed since previous audit:** None. One regression: H1 tag was present in previous audit ("About") and is now missing entirely.

| Severity | Issue | Evidence |
|---|---|---|
| High | No H1 tag (**REGRESSION**) | Previous audit noted H1 existed ("About"). Now missing entirely. |
| High | Title is 19 chars | `"About -- Hmziq blog"` -- need 50-60. |
| High | Meta description is 96 chars | Need 150-160. |
| Medium | Thin content (~158 words) | Need 300-500 for about page. |
| Low | No Person schema | structured_data array is empty. |
| Low | Generic SVG OG image | `og-default.svg` used. |

### Contact (`/contact`) -- Score: 22/100

**Fixed since previous audit:** None.

| Severity | Issue | Evidence |
|---|---|---|
| Critical | No H1 tag | Rendering bug in `[page].astro` contact branch. |
| High | Title is 20 chars | `"Contact -- Hmziq blog"` -- need 50-60. |
| High | Meta description is 65 chars | Need 150-160. |
| Medium | Thin content (~140 words) | Need 200-300. |
| Low | No structured data | No Person or ContactPage schema. |

### Tags Index (`/tags`) -- Score: 35/100

| Severity | Issue | Evidence |
|---|---|---|
| High | Title is 18 chars | `"Tags -- Hmziq blog"` -- need 50-60. |
| High | Meta description is 42 chars | `"Browse 5 recurring topics on Hmziq blog."` -- need 150-160. |
| Medium | Thin content (~131 words) | Minimal unique text beyond tag badges. |
| Low | H1 is bare word "Tags" | Consider "Explore Blog Topics & Tags". |
| Low | No CollectionPage or ItemList schema | structured_data array is empty. |

### Tag Pages (`/tags/astro/`, `/tags/cloudflare/`, `/tags/web-dev/`) -- Score: 30-35/100

All tag pages share these issues:

| Severity | Issue | Evidence |
|---|---|---|
| High | Titles too short (25-30 chars) | `"astro posts -- Hmziq blog"` etc. |
| High | Meta descriptions too short (38-44 chars) | `"1 post tagged with astro on Hmziq blog."` |
| Medium | H1 has hash prefix | `#astro`, `#cloudflare`, `#web-dev`. Remove hash or use CSS `::before`. |
| Medium | Thin content (~83-155 words) | No contextual intro paragraph. |

`/tags/web-dev/` has additional issues: title uses raw slug "web-dev" instead of display name "Web Development". H1 is `#web-dev` instead of descriptive text.

### Categories (`/categories`) -- Score: 50/100

| Severity | Issue | Evidence |
|---|---|---|
| High | Title is 24 chars | Need 50-60. |
| High | Meta description is 43 chars | Need 150-160. |
| Low | H1 is generic "Categories" | Consider "Blog Categories". |
| Low | No CollectionPage or ItemList schema | |

**Positive:** Word count is 1,069 -- significantly better than other listing pages. Canonical URL is correct with trailing slash.

### Privacy (`/privacy`) -- Score: 55/100

| Severity | Issue | Evidence |
|---|---|---|
| Medium | Title is 20 chars | Could expand to "Privacy Policy -- How Hmziq Blog Handles Your Data". |
| Medium | Meta description is 140 chars | Close but below 150 threshold. |
| Low | H1 is generic "Privacy" | Consider "Privacy Policy". |

**Positive:** Good word count at 529 words. Proper heading hierarchy with 7 semantic H2 sections.

### Terms (`/terms`) -- Score: 50/100

| Severity | Issue | Evidence |
|---|---|---|
| High | Title is 18 chars | Need 50-60. |
| High | Meta description is 98 chars | Need 150-160. |
| Low | H1 is generic "Terms" | Consider "Terms of Use". |

**Positive:** 379 words, 6 content H2s. Adequate for legal page.

### 404 (`/404`) -- Score: 80/100

**Best-scoring page.** Robots meta correctly set to noindex/nofollow. Title and meta description appropriate for error page.

| Severity | Issue | Evidence |
|---|---|---|
| Low | H1 is just "404" | Consider "404 -- Page Not Found". |

### Blog Post (`/posts/vibe-coding-astro-cloudflare`) -- Score: 40/100

| Severity | Issue | Evidence |
|---|---|---|
| Critical | Meta description is 52 chars and vague | `"Third attempt at a blog. Finally got this one built."` -- need 150-160 covering Astro, Cloudflare, Hono, D1/KV/R2. |
| High | Title is 65 chars -- exceeds 50-60 range | `"Vibe Coding My Blog in Astro, Deployed on Cloudflare -- Hmziq blog"` |
| High | 1 image missing alt text | Author avatar (`author-light.svg`) with empty alt. |
| Medium | Thin content for deep-dive (~592 words) | Covers 7+ topics in only 592 words. Need 1,500-2,500. |
| Medium | Modal dialog H2s pollute heading hierarchy | 9 total H2s: 7 article content + 2 modal ("Switch to light mode?", "Subscribe to the Newsletter"). |
| Low | BlogPosting missing keywords and wordCount | Schema lacks these fields. |
| Low | No BreadcrumbList schema | Should have Home > Category > Post Title. |

**Positive:** BlogPosting structured data present with correct author, publisher, dates. Custom OG image. OG type correctly set to "article". 9 internal links. Canonical URL correct.

---

## Structured Data Status

### Currently Implemented

| Schema Type | Location | Issues |
|---|---|---|
| WebSite | Homepage | Missing `potentialAction` (SearchAction). No `@id`. |
| Blog | Homepage | Missing `blogPost` array. No `@id`. Duplicate identity with WebSite (both declare the same entity without linking). |
| BlogPosting | Blog posts | Missing `keywords`, `wordCount`, `articleBody`, `articleSection`. Publisher has no `logo` (required for rich results). Author name is "hmziqrs" handle, not real name. |

### Missing Schema

| Schema Type | Where It Belongs | Priority |
|---|---|---|
| **BreadcrumbList** | All pages except home and 404 | High |
| **Organization** | Homepage (top-level entity with `@id`, `logo`, `sameAs`) | High |
| **Person** | Homepage + About page (with `@id`, `url`, `sameAs`) | High |
| **CollectionPage** | `/tags`, `/categories`, and individual tag/category pages | Medium |
| **ItemList** | Homepage, category and tag listing pages | Medium |
| **SearchAction** | Inside WebSite schema on homepage | Medium |
| **ProfilePage / AboutPage** | About page | Low |
| **ContactPage** | Contact page | Low |

### Critical Schema Problems

1. **No `@id` references anywhere.** Every entity is embedded inline. Google cannot reconcile that the publisher on a BlogPosting is the same entity as the Blog on the homepage. Every entity should declare a unique `@id` URI, and other schemas should reference that `@id` instead of embedding full objects.

2. **Duplicate identity on homepage.** WebSite and Blog are separate JSON-LD blocks with overlapping properties but no `@id` to connect them. Merge into a single entity: `{"@type": ["WebSite", "Blog"], "@id": "https://blog.hmziq.rs/#website"}`.

3. **Publisher missing logo.** BlogPosting publisher is typed as Organization but has no `logo` property. Google requires `publisher.logo.url` for Article/BlogPosting rich results. Without it, the post will not earn a rich snippet.

4. **Author uses handle, not real name.** Author `name` is `"hmziqrs"`. Google prefers a real person's name for Person type to qualify for article rich results.

5. **Canonical URL anomalies.** Three entries have broken canonical values: empty string `""`, literal string `"null"`, empty string. Points to missing or malformed `<link rel="canonical">` in some templates.

### Connected Graph Fix

Define entities once with stable `@id` URIs, then reference by ID:

```
https://blog.hmziq.rs/#organization  -- Organization
https://blog.hmziq.rs/#person        -- Person (author)
https://blog.hmziq.rs/#website       -- WebSite + Blog
```

BlogPosting's `author` becomes `{"@id": "https://blog.hmziq.rs/#person"}` instead of a full inline object. Same for `publisher` referencing `#organization`.

---

## Content Quality

### AI Writing Detection

Every unique string across titles, descriptions, headings, and OG fields was examined for AI tells: em dashes (rhetorical, not structural), AI vocabulary, rule-of-three padding, promotional language, signposting, LinkedIn-speak.

| Verdict | Count |
|---|---|
| HUMAN | 38 |
| SUSPICIOUS | 3 |
| AI-GENERATED | 0 |

**Flagged strings (SUSPICIOUS -- not definitive):**

1. Homepage description: "Writing about software engineering, tools, and ideas." -- Rule of three. Mild. Could be natural.
2. Privacy description: "A concise explanation of..." -- Self-referential framing (announcing your own conciseness is an AI tell).
3. Terms description: "A straightforward set of conditions for reading, referencing, and using the site." -- Self-congratulatory "A straightforward set of" + rule of three.

**Not flagged:** Em dashes in page titles (`About -- Hmziq blog`) are structural separators, not rhetorical em dashes. Standard SEO formatting.

**Overall:** The writing is terse, direct, and lacks typical AI markers. The blog post description ("Third attempt at a blog. Finally got this one built.") is distinctly human. No humanizer edits needed.

### Content Depth Issues

| Severity | Issue |
|---|---|
| Critical | Only 1 published post (2 drafts in staging) |
| Critical | Blog post is 592 words -- need 1,500-2,500 for engineering deep-dives |
| High | Zero code examples across all posts |
| High | No images, diagrams, or screenshots in any post body |
| High | No table of contents on posts |
| Medium | Post covers 7+ topics at surface level |
| Medium | Zero internal links between posts |
| Medium | Drafts have spelling errors and missing frontmatter |

### E-E-A-T Gaps

| Signal | Status | Action |
|---|---|---|
| Author real name | Missing (uses "hmziqrs" handle) | Use real display name in structured data and about page |
| Author bio depth | Thin (~30 words, empty focusAreas/principles) | Expand to 200-400 words |
| `rel="me"` on social links | Missing | Add to all social links on about page |
| Author URL mismatch | Structured data points to `hmziq.rs`, about page is `blog.hmziq.rs/about` | Cross-link with `rel="me"` or point to about page |
| Contact info | Present | Consider adding contact form |
| Privacy/Terms | Present | Add data retention periods, DMCA section |

---

## Programmatic SEO Strategy

### Unique Edge

This blog is built on Astro 6 + Tailwind v4 (CSS-only config) + Bun monorepo + Hono Workers + Cloudflare D1/KV/R2/Queues. This exact stack combination has almost zero dedicated content online. Every comparison, code example, and cheatsheet can be sourced from real working code in this repository, vibekit.link, torii.tools, and nutter.tools.

### Top 3 Playbooks by ROI

| Rank | Playbook | Pages | Monthly Volume | Effort | Why |
|---|---|---|---|---|---|
| 1 | **Code Examples** | 200 | 40K-1M aggregate | Low | Lowest competition, highest long-tail. Real code from shipping projects. |
| 2 | **Comparisons** | 80-120 | 20K-500K aggregate | Medium | Captures high-intent traffic. "I use both" authority. |
| 3 | **Cheatsheets** | 40-60 | 15K-200K aggregate | Low | Currency advantage -- Astro 6, Tailwind v4, Bun, Hono are all new. |

**Additional playbooks (lower priority):** Templates (50-80 pages, copy-paste configs from real projects), Glossary (80-100 pages, internal linking infrastructure).

**Skip:** Directory playbook -- saturated by awesome-lists, AlternativeTo, StackShare.

### Code Examples Playbook (200 pages)

URL pattern: `/snippets/{language}/{topic}`

Distribution: TypeScript (40), Rust (30), Astro (30), Cloudflare Workers (30), Hono (25), Tailwind CSS (25), Bun (20).

Each snippet: problem statement, code block from real project, 2-4 sentence explanation, gotcha callout. Stored as markdown in new `content/snippets/` collection. Dynamic routes via `apps/web/src/pages/snippets/[...slug].astro`.

### Comparisons Playbook (80-120 pages)

URL pattern: `/compare/{tool-a}-vs-{tool-b}`

Key comparisons: Astro vs Next.js, Hono vs Express, Bun vs Deno, Cloudflare Workers vs Vercel Edge, Tailwind v4 vs v3, D1 vs Turso, R2 vs S3.

Each comparison: feature matrix table, "Why I Chose X" section with real project code, "When Y Makes More Sense" counterpoint, verdict. Every page must include at least one real project reference.

### Cheatsheets Playbook (40-60 pages)

URL pattern: `/cheatsheet/{topic}`

Key topics: Tailwind v4 syntax, Astro 6 Content Layer, Bun CLI, Hono routing, Cloudflare Wrangler, TypeScript utility types, Zod 4.

Each cheatsheet: dense reference tables, "From My Setup" section showing real config, migration table (old way vs new way), gotchas.

### Internal Linking Architecture

Hub-and-spoke model with bidirectional links between all playbook types:

- Every blog post links to 3-5 related snippets, 1-2 comparisons, 1 cheatsheet
- Every snippet links to parent cheatsheet, related snippets, demonstrating blog post
- Every comparison links to snippets for each tool, winning tool's cheatsheet, starter template
- Every cheatsheet links to all snippets in topic, relevant templates, glossary terms
- Every glossary term links to 2-3 related terms, 1-2 demonstrating snippets, relevant comparison

### Scale Targets

| Phase | Timeline | Snippets | Comparisons | Cheatsheets | Templates | Glossary | Total |
|---|---|---|---|---|---|---|---|
| Seed | Week 3-4 | 20 | 5 | 3 | 0 | 5 | 33 |
| Scale | Month 3 | 100 | 20 | 10 | 15 | 40 | 185 |
| Full | Month 6 | 150 | 60 | 30 | 40 | 70 | 350 |
| Target | Ongoing | 200 | 100 | 50 | 70 | 90 | 510 |

### Implementation Requirements

New content collections: `snippets`, `comparisons`, `cheatsheets`, `templates`, `glossary` in `content.config.ts`.

New route directories: `pages/snippets/`, `pages/compare/`, `pages/cheatsheet/`, `pages/template/`, `pages/glossary/`.

New components: `SnippetCard.astro`, `ComparisonTable.astro`, `CodeBlock.astro`, `PSEOContext.astro`, `FilterBar.astro`, `AlphabetIndex.astro`.

New layout: `PSEOLayout.astro` extending BaseLayout with breadcrumb, sidebar, and cross-linking.

SEO meta templates per playbook type (50-60 char titles, 150-160 char descriptions with specific patterns for each type).

---

## Action Plan

### Priority 1: Critical Fixes (2-3 hours)

| # | Action | Effort | Impact |
|---|---|---|---|
| 1 | Fix missing H1 on Homepage, About, and Contact | 30 min | Critical -- About is a regression |
| 2 | Rewrite blog post meta description to 150-160 chars | 20 min | Critical -- 52 chars is the worst on the site |
| 3 | Fix atom.xml 404 -- verify Cloudflare Pages deployment | 15 min | Critical -- feed returns 404 live |
| 4 | Verify `PUBLIC_SITE_URL=https://blog.hmziq.rs` in production build | 15 min | Critical -- fixes atom feed staging URL and llms.txt relative paths |

### Priority 2: High-Impact Systemic Fixes (3-4 hours)

| # | Action | Effort | Impact |
|---|---|---|---|
| 5 | Expand all page titles to 50-60 chars (override per-page in `site.config.ts`) | 1 hr | High -- every title is short |
| 6 | Expand all meta descriptions to 150-160 chars | 1 hr | High -- every description is short |
| 7 | Add `@id` to all schema entities, connect graph, add Organization + Person | 1 hr | High -- schema is disconnected |
| 8 | Add `publisher.logo` to BlogPosting (required for rich results) | 15 min | High -- blocks rich snippets |
| 9 | Add BreadcrumbList schema to all pages except home and 404 | 30 min | High -- highest-ROI schema addition |

### Priority 3: Content Quick Wins (4-6 hours)

| # | Action | Effort | Impact |
|---|---|---|---|
| 10 | Publish 2 draft posts with fixed frontmatter and spelling | 2 hr | High -- doubles published content |
| 11 | Add alt text to author avatar image | 5 min | Medium |
| 12 | Remove hash prefix from tag page H1s, add display name map | 30 min | Medium |
| 13 | Change modal dialog H2s to styled divs | 20 min | Medium -- affects every page |
| 14 | Shorten blog post title to under 60 chars | 15 min | Medium |
| 15 | Add `potentialAction` SearchAction to WebSite schema | 15 min | Medium |

### Priority 4: Security and Infrastructure (1-2 hours)

| # | Action | Effort | Impact |
|---|---|---|---|
| 16 | Enable HSTS via Cloudflare | 10 min | High |
| 17 | Add CSP and X-Frame-Options headers | 30 min | Medium |
| 18 | Add sitemap lastmod dates via `serialize()` in astro config | 20 min | Medium |
| 19 | Fix uppercase `/category/Engineering/` URL | 15 min | Medium |
| 20 | Add `X-Robots-Tag: noindex` to JSON API endpoints | 15 min | Low |

### Priority 5: Programmatic SEO Foundation (Week 1-2)

| # | Action | Effort | Impact |
|---|---|---|---|
| 21 | Set up 5 new content collections in `content.config.ts` | 1 hr | High -- enables all pSEO |
| 22 | Create `PSEOLayout.astro` with breadcrumb, sidebar, cross-linking | 2 hr | High |
| 23 | Create all dynamic route files and index pages | 2 hr | High |
| 24 | Create `CodeBlock.astro` with copy-to-clipboard | 1 hr | Medium |
| 25 | Write 20 seed snippets from existing codebase | 3 hr | High -- first pSEO content |

### Priority 6: Ongoing Content Production (Month 2+)

- Publish 2-3 blog posts per month (1,500-2,500 words each, with code examples and diagrams)
- Add 10-15 snippets per week
- Add 2-3 comparisons per week
- Add 1 cheatsheet per week
- Add 5 glossary terms per week
- Add 2-3 templates per week
- Expand About page to 300-500 words with Person schema
- Add `rel="me"` to all social links
- Generate dynamic OG images per page type
- Build "Related Posts" component for PostLayout
