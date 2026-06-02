# SEO Audit Report — blog.hmziq.rs

**Date:** June 2, 2026
**Agents Spawned:** 62
**Pages Audited:** 41
**Health Score:** 38 / 100

---

## Phase 1 — Technical SEO

### robots.txt

| Severity | Issue | Evidence | Fix |
|---|---|---|---|
| Info | Missing `Crawl-delay` directive | No crawl delay set. Aggressive crawling could waste bandwidth on Cloudflare Pages. | Add `Crawl-delay: 10` under `User-agent: *`. Googlebot ignores it but Bingbot respects it. |
| Info | No disallow for `/tags/` or `/categories/` | Tag and category listing pages may create thin/duplicate content if every variant is crawlable. | Optionally add `Disallow: /tags/` and `Disallow: /categories/`, or rely on noindex meta tags on those pages. |
| Info | No disallow for `/newsletter/unsubscribe` | Utility page that shouldn't appear in search results. | Add `Disallow: /newsletter/unsubscribe`. |
| Info | No disallow for `/changelog` or `/newsletter` | Site config defines footer nav for `/changelog` and `/newsletter`. The `/newsletter` path has form submission pages. | Consider adding `Disallow: /newsletter`. |
| Info | Cloudflare Managed Content may prepend AI bot blocks | Web reader fetch showed Cloudflare prepending User-agent blocks for Amazonbot, GPTBot, ClaudeBot, CCBot, Bytespider etc. with `Disallow: /`. Direct curl shows only the Astro-generated 88-byte response. | If Cloudflare AI Audit feature is enabled, verify in dashboard whether managed content prepends reliably to all requests. |
| OK | Sitemap reference is valid and reachable | Points to `https://blog.hmziq.rs/sitemap-index.xml`, returns 200 with `Content-Type: application/xml`. | No fix needed. |
| OK | `/api/` disallow is correct | Static site, API served by separate Cloudflare Worker on same domain. Directive is defensive. | No fix needed. |

### Sitemap

| Severity | Issue | Evidence | Fix |
|---|---|---|---|
| Medium | No `<lastmod>` elements | All 18 `<url>` entries in sitemap-0.xml lack lastmod dates. Search engines can't determine content freshness. | Add `<lastmod>` dates (YYYY-MM-DD) to each URL entry. Map from content collection frontmatter `updated` or `date`. |
| Medium | Uppercase characters in URL | `https://blog.hmziq.rs/category/Engineering/` contains uppercase `E` in the path segment. | Use lowercase paths consistently. Add 301 redirect from old URL to `/category/engineering/`. |
| Warning | Sitemap does not include `<image:image>` extensions | Sitemap declares `xmlns:image` namespace but no `<url>` entry contains `<image:image>` child elements. | Add image sitemap extensions for posts that contain images. |
| Info | Non-content pages included in sitemap | Utility and legal pages (unsubscribe, privacy, terms, advertise) are in the sitemap. | Consider excluding utility/legal pages via `@astrojs/sitemap` filter option. |
| Info | Only one child sitemap | `sitemap-index.xml` contains only `sitemap-0.xml`. Normal for a small blog. | No fix needed. |
| Minor | Cache-Control set to `max-age=0, must-revalidate` on sitemap | Sitemap changes infrequently and could be cached longer. | Consider longer cache duration (e.g., `max-age=3600`). |
| OK | 18 URLs listed | Covers homepage, about, advertise, categories, changelog, contact, newsletter, posts, privacy, tags, terms. | No fix needed. |

### Meta Tags & Head (Homepage)

| Severity | Issue | Evidence | Fix |
|---|---|---|---|
| High | Title tag is 10 characters | `<title>Hmziq blog</title>` — far below the 50-60 character range. | Expand to 50-60 chars. Example: `"Hmziq Blog — Software Engineering, Tools & Web Dev Insights"`. |
| High | Meta description is 53 characters | `content="Writing about software engineering, tools, and ideas."` — well below 150-160 chars. | Write 150-160 char description with keywords and CTA. |
| High | No H1 tag on homepage | HTML contains zero `<h1>` elements. Post title uses `<h2>`. | Add a single `<h1>` with a keyword target. |
| Medium | OG image is an SVG file | `og:image` points to `og-default.svg`. Most social platforms don't reliably render SVGs. | Generate a PNG at 1200x630px. |
| Medium | Homepage has ~34 words of visible content | `<main>` element contains approximately 218 chars. Almost entirely a single post card. | Add intro section, topic overview. Aim for 300+ words. |
| Low | Post card heading uses H2 without parent H1 | Heading hierarchy jumps from nothing directly to `<h2>`. | Will be resolved by adding an H1. |

### HTTPS & Security Headers

| Severity | Issue | Evidence | Fix |
|---|---|---|---|
| High | Missing `Strict-Transport-Security` (HSTS) | Response headers do not include HSTS. | Enable via Cloudflare: `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`. |
| Medium | Missing `Content-Security-Policy` | No CSP header present. | Add via Cloudflare: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:`. |
| Medium | Missing `X-Frame-Options` | Site could be embedded in iframes (clickjacking risk). | Add `X-Frame-Options: DENY` or `SAMEORIGIN`. |
| Low | Missing `Permissions-Policy` | Browser features like camera, microphone can be invoked by any script. | Add `Permissions-Policy: camera=(), microphone=(), geolocation=()`. |
| Low | Overly permissive CORS | `access-control-allow-origin: *` allows any origin. Unnecessary for a static blog. | Remove wildcard or restrict to trusted origins. |
| OK | SSL certificate is valid | Issued by Google Trust Services. TLS 1.2+ supported. HTTP redirects to HTTPS. | No fix needed. |
| OK | No mixed content | All resource URLs use HTTPS or relative paths. | No fix needed. |
| OK | `X-Content-Type-Options` and `Referrer-Policy` are correct | `nosniff` and `strict-origin-when-cross-origin`. | No fix needed. |

### Feeds (RSS & Atom)

| Severity | Issue | Evidence | Fix |
|---|---|---|---|
| Critical | Atom feed returns HTTP 404 on live site | `/atom.xml` exists in source and dist but is not reachable at `blog.hmziq.rs`. | Verify Cloudflare Pages routing. Ensure latest build is deployed to production. |
| Critical | Atom feed self link and id point to staging URL | Built `atom.xml` contains `https://staging.hmziqblog.pages.dev/atom.xml` instead of `blog.hmziq.rs`. | Ensure production build sets `PUBLIC_SITE_URL=https://blog.hmziq.rs`. |
| Warning | No `<content>` elements in Atom feed | Each entry only has `<summary>`, no `<content type="html">` with full/partial post body. | Add `<content type="html">` element with at least a content snippet per entry. |
| Warning | No `<author>` elements in feeds | RSS and Atom items lack `<dc:creator>` or `<author>` entries. | Add `<author><name>hmziqrs</name><uri>https://hmziq.rs/</uri></author>` using `siteConfig.author`. |
| Warning | Atom feed has only 1 entry | Most blog feeds include 10-25 recent posts. | Will grow as more posts are published. No code change needed. |
| Info | Atom feed autodiscovery link uses relative path | BaseLayout line 82 uses relative path for the feed alternate link. | Consider using absolute URL for reliability across deployment configs. |
| Info | Atom feed entry summary text is vague and not keyword-rich | "Third attempt at a blog. Finally got this one built." does not describe the post's actual content. | Update post frontmatter description to be keyword-rich. |
| OK | RSS feed at `/rss.xml` is valid XML | Standard RSS 2.0 with Atom namespace. All non-draft posts included. | No fix needed. |
| OK | Autodiscovery links present in `<head>` | Both RSS and Atom linked in BaseLayout. | No fix needed. |

### llms.txt

| Severity | Issue | Evidence | Fix |
|---|---|---|---|
| High | All URLs are relative paths | Live output shows `(/posts/vibe-coding-astro-cloudflare)` instead of absolute URLs. `toAbsoluteUrl` should produce full URLs but build env may have wrong `PUBLIC_SITE_URL`. | Verify `PUBLIC_SITE_URL=https://blog.hmziq.rs` is set during Cloudflare Pages build. |
| Medium | Newsletters section present in source but missing from live output | Source code lines 75-82 define a `## Newsletters` section, but live output ends after `## Info` with no Newsletters section. | Check if newsletters collection is populated at build time. Investigate whether Astro build correctly resolves the collection. |
| Medium | No `llms-full.txt` endpoint | AI search engines (Perplexity, ChatGPT) prefer full content for citation. | Generate `/llms-full.txt` with full post body text, not just titles and descriptions. |
| Low | Site description in blockquote is vague for LLM consumers | Current description "Writing about software engineering, tools, and ideas." is not descriptive enough. | Expand to mention specific stack and content types. |
| Info | No feed links (RSS/Atom) referenced in llms.txt | Source code lists pages but does not reference `/rss.xml` or `/atom.xml` feeds. | Consider adding feed links in the `## Info` section. |

### URL Structure & Architecture

| Severity | Issue | Evidence | Fix |
|---|---|---|---|
| Medium | Inconsistent case in URLs | `/category/Engineering/` has uppercase `E`. | Use lowercase paths. Add 301 redirect. |
| Info | Duplicate indexing of `/categories` and `/categories/` | Google indexes both with and without trailing slash as separate URLs. | Ensure consistent linking throughout the site. |
| Info | Important pages within 3 clicks | Homepage → nav/footer links reach all pages within 2-3 clicks. | No fix needed. |
| OK | URLs are clean and descriptive | `/posts/vibe-coding-astro-cloudflare`, `/about`, `/privacy`. | No fix needed. |
| OK | Consistent trailing slashes | Pages use trailing slashes consistently (except duplicate indexing noted above). | No fix needed. |

---

## Phase 2 — On-Page SEO

### Homepage (`/`)

| Severity | Issue | Fix |
|---|---|---|
| High | Title tag is 10 chars (`"Hmziq blog"`) | Expand to 50-60 chars with keyword and value prop. |
| High | Meta description is 53 chars | Expand to 150-160 chars with keywords and CTA. |
| High | No H1 tag | Add `<h1>` with primary keyword. |
| Medium | OG image is SVG | Generate PNG at 1200x630. |
| Medium | Body content is ~34 words | Add intro section, topic categories overview. Aim for 300+ words. |
| Low | Post card H2 not nested under an H1 | Heading hierarchy jumps from nothing directly to `<h2>`. Resolved by adding H1. |

### About (`/about`)

| Severity | Issue | Fix |
|---|---|---|
| High | Title is 19 chars (`"About — Hmziq blog"`) | Expand to 50-60 chars. Example: `"About Hmziq — Full-Stack Engineer & Software Writer \| Blog"`. |
| High | Meta description is 96 chars | Expand to 150-160 chars. |
| High | H1 is just "About" with no keyword or descriptive value | Change to `"About Hmziq — Full-Stack Engineer & Writer"` or similar. |
| Medium | No H2 headings — hierarchy skips from H1 directly to H3 | Add H2 headings to structure page content (e.g., Background, Stack, Projects). |
| Medium | Content is only ~30 words across 3 brief paragraphs | Expand to 300-500 words. Populate `focusAreas` and `principles` fields in `site.config.ts`. |
| Low | No images with alt text on about page | Add author photo with descriptive alt text. |
| Low | Title and meta description identical to JSON config, not SEO-optimized | Override with SEO-optimized values specific to the page. |
| Info | Internal links limited to Tags, Categories, and footer | Add 2-3 contextual internal links to blog posts. |

### Contact (`/contact`)

| Severity | Issue | Fix |
|---|---|---|
| Critical | H1 tag missing from rendered page | Debug PageHeader component rendering in `[page].astro` contact branch. |
| High | Title is 20 chars | Expand to 50-60 chars. |
| High | Meta description is 65 chars | Expand to 150-160 chars. |
| High | Heading hierarchy broken — no H1, only H2s from modals | Fix missing H1 first, then add H2 to structure contact content. |
| Medium | Body content is ~52 words | Expand with project types, response time, availability. Aim for 200-300 words. |
| Low | No contact-specific structured data | Add Person schema with sameAs listing social profiles. |
| Low | All contact method links open external sites, no internal links in body | Add 1-2 internal links within contact page body text. |
| Info | No images on the page | Consider adding a professional headshot or branded illustration. |

### Unsubscribe (`/newsletter/unsubscribe`)

| Severity | Issue | Fix |
|---|---|---|
| Critical | No visible H1 on initial page load | Two hidden H1s toggled by JS. Add visible H1 in loading state. |
| Critical | `noindex` prop not taking effect | Page shows `index, follow` despite passing `noindex={true}`. Debug prop resolution at build time. |
| Critical | Title is 27 chars | Expand to 50-60 chars. |
| High | Meta description is 32 chars | Expand to 150-160 chars. |
| High | Body content is ~10 words on load | Add contextual content about what unsubscribing means. Aim for 200-300 words. |
| Medium | No heading hierarchy — H1s hidden, no H2s in page content | Restructure with a visible H1 and add H2 subheadings. |
| Medium | Only 2 internal links, both pointing to homepage | Add links to `/newsletter`, `/contact`, `/privacy`. |
| Low | Two H1 elements in the DOM simultaneously | Change one to H2 or restructure so only one H1 exists. |
| Low | No images on the page | Consider adding a small illustration or icon. |

### Tags Index (`/tags`)

| Severity | Issue | Fix |
|---|---|---|
| Critical | Title is 18 chars (`"Tags — Hmziq blog"`) | Expand to 50-60 chars. |
| Critical | Meta description is 42 chars (`"Browse 5 recurring topics on Hmziq blog."`) | Write compelling 150-160 char description. |
| Warning | H1 is bare word "Tags" — lacks descriptive keyword context | Consider `"Browse All Tags"` or `"Explore Blog Topics"`. |
| Warning | Thin content — no descriptive text beyond H1 and tag badges | Add introductory paragraph using PageHeader's `description` prop. Aim for 300+ words. |
| Warning | No heading hierarchy for semantic content — H2s only exist in modal dialogs | Add H2/H3 headings if descriptive content is added. |
| Info | No images, no visual richness | Consider adding an OG image or visual header. |
| Info | No structured data (JSON-LD) specific to tags collection page | Add CollectionPage or ItemList schema. |

### Tag Pages (All — `/tags/astro`, `/tags/blog`, `/tags/cloudflare`, `/tags/web-dev`)

| Severity | Issue | Fix |
|---|---|---|
| High | All tag titles too short (18-29 chars) | Rewrite title template for 50-60 chars per tag page. |
| High | All tag meta descriptions too short (38-44 chars) | Write 150-160 char descriptions per tag. |
| Medium | All tag H1s have hash prefix (`#astro`, `#blog`, `#cloudflare`, `#web-dev`) | Remove `#` prefix. Use `"Posts tagged [tag]"` or `"[Tag Name] Articles"`. Use CSS `::before` if hash is a design element. |
| Medium | All tag pages have very thin content (~80-210 chars of body text) | Add contextual content (100-300 words) or noindex tag pages with fewer than 3 posts until enough content exists. |
| Medium | `/tags/web-dev` title uses raw slug "web-dev" instead of display name | Add a `tagDisplayNames` map in `site.config.ts` to map slugs to human-friendly labels. |
| Low | Self-referencing tag link on own tag page | Conditionally remove or disable the current tag's link on its own page. |
| Low | H1 nested inside `<header>` within `<main>` — double-header pattern | Consider using `<section>` or `<div>` instead of inner `<header>`. |
| Low | OG titles and descriptions mirror the short meta tags — social previews suboptimal | Craft social-specific OG title and description per tag. |
| Low | Modal dialog H2s pollute heading hierarchy | Use `aria-hidden` or `role="dialog"` on modals. |
| Info | All tag pages use generic default OG image | Generate dynamic OG images per tag. |
| Info | `/tags/cloudflare` canonical trailing slash vs no-trailing-slash URL mismatch | Ensure consistent linking throughout the site. |

### Categories (`/categories`)

| Severity | Issue | Fix |
|---|---|---|
| Warning | Title is 24 chars | Expand with keyword modifiers. |
| Warning | Meta description is 43 chars (`"Browse 1 categories on Hmziq blog."`) | Write compelling 150-160 char description. |
| Warning | Thin content — ~120 chars of unique body content | Add intro paragraph, category descriptions, recent posts per category. Aim for 300+ words. |
| Info | H1 is generic "Categories" without keyword differentiator | Consider `"Blog Categories"` for keyword context. |
| Info | Internal links limited to single category link plus nav/footer | Add introductory paragraph with links to popular posts. |
| Info | OG image is generic default SVG | Consider generating dynamic OG image. |
| OK | Heading hierarchy correct (single H1, H2s in modals only) | No fix needed. |
| OK | Canonical URL correctly points to `/categories/` with trailing slash | No fix needed. |

### Category — Engineering (`/category/Engineering`)

| Severity | Issue | Fix |
|---|---|---|
| Warning | Title is 33 chars | Expand to 50-60 chars. Example: `"Engineering Articles & Tutorials — Hmziq Blog"`. |
| Warning | Meta description is 49 chars, auto-generated (`"1 post in the Engineering category on Hmziq blog."`) | Write hand-crafted 150-160 char description. |
| Warning | H1 is generic single word ("Engineering") | Enrich with keyword phrase. Example: `"Engineering Articles"`. |
| Info | Only 1 post in category | Will improve as more posts are published. Add category-specific intro paragraph in the meantime. |
| Info | No structured data (JSON-LD) | Add ItemList or CollectionPage schema in `[category].astro`. |

### Privacy (`/privacy`)

| Severity | Issue | Fix |
|---|---|---|
| Medium | Title is 20 chars | Expand to 50-60 chars. Example: `"Privacy Policy — How Hmziq Blog Handles Your Data"`. |
| Medium | Meta description is 140 chars | Expand to 150-160 chars. |
| Low | H1 is generic word "Privacy" | Consider `"Privacy Policy"` or `"How Hmziq Blog Handles Your Data"`. |
| Low | Two non-content H2 headings from modals inflate heading count | Use `aria-hidden` or `role="dialog"` on modals, or change modal headings from H2 to styled divs. |
| Info | Content ~500 words — acceptable for legal pages but on lighter side | Consider adding data retention periods, GDPR/CCPA compliance notes. |
| Info | Only one contextual internal link within body (to `/contact`) | Add 1-2 more contextual internal links. |
| Info | No page-specific OG image | Consider creating a custom OG image. |

### Terms (`/terms`)

| Severity | Issue | Fix |
|---|---|---|
| Warning | Title is 18 chars (`"Terms — Hmziq blog"`) | Expand to 50-60 chars. |
| Warning | Meta description is 98 chars | Expand to 150-160 chars. |
| Info | H1 is generic "Terms" | Consider `"Terms of Use"` or `"Terms and Conditions"`. |
| Info | Content ~312 words — adequate but could be expanded | Consider adding DMCA/copyright reporting section. Expected by some ad networks. |
| OK | Heading hierarchy correct: single H1 followed by H2 sections | No fix needed. |
| OK | Internal linking adequate with 16 internal links | No fix needed. |

### Blog Post (`/posts/vibe-coding-astro-cloudflare`)

| Severity | Issue | Fix |
|---|---|---|
| Critical | Meta description is 52 chars and vague (`"Third attempt at a blog. Finally got this one built."`) | Rewrite to 150-160 chars covering Astro, Cloudflare, Hono, D1/KV/R2. |
| Warning | Title is 65 chars — exceeds 50-60 optimal range (`"Vibe Coding My Blog in Astro, Deployed on Cloudflare — Hmziq blog"`) | Shorten title or conditionally omit site name on long titles. |
| Warning | Content ~592 words for a long-form engineering post covering framework, architecture, deployment, CI/CD | Expand to 1500-2500 words with code snippets, architecture diagrams, performance metrics. |
| Warning | Zero internal links within article body | Add 2-3 contextual internal links to related posts/pages. |
| Info | H2 headings from modal dialogs pollute heading hierarchy (9 H2s total: 7 article + 2 modal) | Change dialog headings to div/span or wrap in `aria-hidden`. |
| Info | Author avatar image (`author-light.svg`) has empty alt attribute (`alt=""`) | Add descriptive alt attribute like `"Author avatar"`. |
| Info | External links in article body lack descriptive anchor text | Bare domain names used instead of descriptive text. |

### JSON API Endpoints (`/api/*.json`)

| Severity | Issue | Fix |
|---|---|---|
| Warning | All JSON endpoints return HTTP 200 with no `X-Robots-Tag: noindex` header | Add `X-Robots-Tag: noindex` header to all `/api/` responses to prevent crawl budget waste. |
| Warning | `Cache-Control: max-age=0, must-revalidate` on all JSON endpoints | Set longer cache duration for static JSON (e.g., `max-age=3600`). |
| Info | `/api/index.json` JSON feed not linked via `<link rel="alternate">` | Add alternate link or standard JSON Feed path `/feed.json`. |
| Info | No `rel="canonical"` or `Link` header pointing to HTML versions | JSON endpoints should reference their HTML equivalents. |

### Error Page (`/500`)

| Severity | Issue | Fix |
|---|---|---|
| Low | H1 is just error code "500" | Consider `"500 — Server Error"`. Minor for a noindex page. |
| OK | Robots meta correctly set to `noindex, nofollow` | Correct behavior for error pages. |
| OK | Title and meta description short but acceptable for error page | No fix needed. |

### Systemic Issues (All Pages)

| Issue | Impact | Fix |
|---|---|---|
| All titles too short | `formatPageTitle` produces "Page — Hmziq blog" pattern | Override per-page with 50-60 char titles in `site.config.ts` pages config. |
| All listing pages have thin content | Categories, tags, category pages are just post links with no unique text | Add introductory paragraphs with keyword context to each listing page. |
| No unique OG images per page | All pages use the same `og-default.svg` | Generate dynamic OG images per post using satori or `@astrojs/svelte`. |
| No "Related Posts" sections | Zero internal links between posts | Add related posts component to PostLayout based on shared tags/categories. |
| No table of contents | Posts with multiple subheadings lack navigation | Add auto-generated TOC component for posts with 3+ subheadings. |
| Modal dialog H2s pollute heading hierarchy | "Switch to light mode?" and "Subscribe to the Newsletter" appear as H2s on every page | Change modal headings to styled divs/span or wrap in `aria-hidden`. |
| Tag H1s use `#` prefix | All tag page headings have `#tag` pattern instead of descriptive text | Remove `#` prefix from H1. Use CSS `::before` for visual hash if needed. |
| Tag slugs used as display names | "web-dev" shown instead of "Web Development" | Add `tagDisplayNames` map in `site.config.ts`. |

---

## Phase 3 — Schema & Structured Data

### Currently Implemented

| Schema Type | Pages | Status |
|---|---|---|
| WebSite | Homepage | Present, missing SearchAction |
| Blog | Homepage | Present, no author reference |
| BlogPosting | Blog posts | Present, missing keywords/wordCount/articleBody |

### Missing Schema

| Schema Type | Where It Belongs | Priority |
|---|---|---|
| **BreadcrumbList** | All posts, categories, tags, newsletter issues | High |
| **Organization** | Homepage (top-level entity) | High |
| **Person** | About page (author entity with sameAs) | High |
| **ItemList** | Homepage, category and tag listing pages | Medium |
| **CollectionPage** | `/tags`, `/categories`, and individual tag/category pages | Medium |
| **Article** | Newsletter issue pages | Medium |
| **SearchAction** | Inside WebSite schema on homepage | Low |
| **HowTo** | Tutorial posts with step-by-step content | Low |
| **FAQPage** | Posts with Q&A sections | Low |
| **ImageObject** | Posts with cover images | Low |

### Schema Quality Issues

| Severity | Issue | Fix |
|---|---|---|
| Medium | No BreadcrumbList schema on any page | Add BreadcrumbList JSON-LD to PostLayout with items: Home > Category > Post Title. Add to category, tag, and newsletter pages. |
| Medium | BlogPosting references Organization as publisher but no top-level Organization schema exists | Add Organization schema to homepage alongside WebSite/Blog. |
| Low | BlogPosting missing `keywords` field | Add `keywords: frontmatter.tags.join(', ')`. |
| Low | BlogPosting missing `wordCount` | Derive from reading time utility. |
| Low | BlogPosting missing `articleBody` hint | Add first paragraph or full text to help search engines understand content depth. |
| Low | Newsletter pages have zero structured data | Add Article or BlogPosting schema to `newsletter/[slug].astro`. |
| Low | WebSite schema lacks `SearchAction` | Add if site supports a search URL pattern. |
| Low | About page has no Person schema | Add Person schema with sameAs pointing to social profiles. |
| Low | Blog schema on homepage has no author reference | Add author property pointing to Person entity. |
| Low | No site-wide schema graph connecting entities | Generate a connected schema graph using `@id` references: WebSite > Blog > BlogPosting > Person > Organization, rather than duplicating properties. |

---

## Phase 4 — Content Quality & Humanizer

### AI Writing Detection Scores

| Post | AI Score | Key Patterns | Verdict |
|---|---|---|---|
| Vibe Coding My Blog in Astro, Deployed on Cloudflare | 12/100 | Signposting 1/5 (TL;DR block), -ing participle 1/5, Bold headers 1/5, Title case headings 2/5 | Human-written. Direct, opinionated voice. Zero AI vocabulary. |
| Building with Astro 6 | 8/100 | Em dashes 2/5 (Stack list separators), Bold headers 2/5 (tech stack listing) | Clearly human. Sparse, factual, specific. |
| Shipping with Less | 8/100 | Rule of three 1/5 (slight), Excessive hedging 1/5 (justified), Title case headings 2/5 | Human-written. Restrained, philosophical tone. |

**No humanizer edits needed.** All posts score well below the concern threshold (50+). The writing voice is naturally clean with:
- Zero AI vocabulary (no "delve", "testament", "vibrant tapestry", "pivotal")
- Direct opinions and specific details ("Lord Bezos", "hideous", "3x :D")
- Varied sentence rhythm
- No em dash overuse, no rule-of-three padding, no promotional language

**Minor recommendations:**
- Post 1: Consider converting TL;DR block from bold-prefixed prose into a plain summary sentence.
- Post 3: The 404 on the live site should be investigated. The post exists in `content-staging` but may not be deployed.

### Content Depth Issues

| Severity | Issue | Fix |
|---|---|---|
| Critical | Only 1 published post (2 drafts in staging) | Publish at least 5-10 posts. Finish drafts with fixed frontmatter, spelling, and structure. |
| Critical | Average word count is 601 (need 1500-2500) | Expand each post with concrete examples, walkthroughs, deeper analysis. Post 1: 603 words, Post 2: 277 words, Post 3: 924 words. None reach 1000. |
| High | Zero code examples across all posts | Add code blocks to every technical post. Post 1 discusses Hono, D1, KV, Queues, R2, GitHub Actions but contains zero code. |
| High | No images, diagrams, or screenshots in any post body | Add architecture diagrams, screenshots, before/after visuals. Post 1 describes D1/KV/Queues/R2 flow — visualize it. |
| High | No table of contents | Add TOC component to PostLayout. Post 1 has 7 subheadings that would benefit. |
| High | Drafts 2 and 3 have no subheadings (wall of text) | Break into sections with descriptive H2/H3 headings. Post 2: 0 `##` headings. Post 3: 0 `##` headings despite being longest at 924 words. |
| High | Drafts 2 and 3 missing required frontmatter fields | Both drafts only have `title`. Missing: description, date, category, tags, cover image, cover_alt, draft flag. Follow Post 1's pattern. |
| Medium | Post 2 (Hermes) has spelling errors | Fix: "Cannabon"→Kanban, "coing"→coding, "multi-agnet"→multi-agent, "there projects"→their projects, "That what has been by experience"→grammar fix. Run-on sentences throughout. |
| Medium | Post 3 (AI Fatigue) has spelling errors | Fix: "becuase"→because, "mutliple"→multiple, "seprate"→separate, "practive"→practice, "frcition"→friction, "jugling"→juggling, "patiece"→patience. |
| Medium | Post 1 covers too many topics at surface level | Touches Framework, Architecture, Deployment, Media Pipeline, CI/CD, Vibe Coding, Roadmap, Side Projects — all in 603 words. Either expand to 2000+ word deep dive or split into a multi-part series. |
| Medium | Zero internal links between posts | Post 3's "this blog's development" should link to Post 1. Post 1's AI tools mention could link to Post 2. |

### E-E-A-T Signals

| Signal | Present | Notes | Recommendation |
|---|---|---|---|
| Author identity | Yes | Consistent "hmziqrs" handle everywhere | Consider using a real display name for stronger E-E-A-T. Google quality raters look for real identities. |
| Author bio depth | No | Only 3 short sentences (~30 words) on About page. `focusAreas` and `principles` in `site.config.ts` are both empty `[]`. | Expand to 200-400 words with projects, experience, specialties, open-source contributions. |
| Real name | No | Using handle "hmziqrs" | Add real name in author display and structured data. Keep "hmziqrs" as social handle. |
| Credentials | No | No degrees, certifications, or company history | Add if available. Even informal credentials like "contributor to [project]" help. |
| First-hand experience | Yes | Posts show actual project work | Continue publishing hands-on content with code and screenshots. |
| Social links | Yes | 5 profiles: X, GitHub, LinkedIn, Telegram, Reddit | Ensure LinkedIn is filled out. Consider adding Mastodon/Bluesky. Add `rel="me"` to all social links. |
| Contact info | Yes | Dedicated `/contact` page with 5 methods | Consider adding a contact form to lower barrier. |
| Privacy policy | Yes | Full policy at `/privacy` with effective date (April 19, 2026) | Add cookie consent banner disclosure (site mentions analytics). Add data retention periods for newsletter subscribers. Link privacy policy in newsletter CTA more prominently. |
| Terms of use | Yes | Full terms at `/terms` (March 31, 2026) | Add DMCA/copyright infringement reporting section. Expected by some ad networks. |
| Sourced claims | No | No external citations in any post | Add "Sources" or "References" sections to technical posts. Link to official docs, primary sources, GitHub repos. |
| Author schema | Partial | Person schema in posts, but no sameAs | Add sameAs with social URLs to Person schema. Add standalone Person schema to About page and homepage. |
| Content volume | No | Only 1 published post | Target 1-2 posts/month in focused topic clusters (Astro, Cloudflare, TypeScript). |
| Author avatar | Yes | SVG avatars in PostLayout | Verify SVGs look like a person, not just an icon. A real photo builds more trust. |

---

## Phase 5 — Programmatic SEO & Competitors

### pSEO Playbook Rankings

| Priority | Playbook | Estimated Pages | Volume | Complexity | Uniqueness |
|---|---|---|---|---|---|
| 1 | **Comparisons** | 150 | High (500-10K monthly per page) | Medium | High |
| 2 | **Code Examples** | 200 | Very High (200-5K monthly per page) | Low-Medium | Medium-High |
| 3 | **Cheatsheets** | 50 | High (typescript ~30K/mo, rust ~8K/mo) | Low | Medium |
| 4 | **Templates** | 120 | Medium-High (100-3K monthly per page) | Low | Medium |
| 5 | **Glossary** | 150 | Low-Medium | Low-Medium | Low |
| 6 | **Directory** | 100 | Low | High | Very Low |

### Playbook Details

**1. Comparisons** — Priority 1
Head-to-head comparison pages for tools and frameworks with real hands-on experience:
- Astro vs Next.js, Hono vs Express, Bun vs Deno vs Node
- Cloudflare Workers vs Vercel Edge, Tailwind vs CSS Modules, Rust vs Go for CLI
- Each page: feature matrix, benchmarks from real usage, use-case recommendations
- This blog IS built on Astro + Cloudflare + Hono + Bun — authentic differentiation from generic listicles
- Long-tail combinations (e.g., "Hono vs Express for serverless") have lower competition and are winnable for a new site

**2. Code Examples** — Priority 2
Code snippet pages organized by language/framework/task:
- TypeScript generic constraints, Rust async/await patterns
- Astro content collection examples, Tailwind v4 `@theme` examples
- Hono middleware examples, Bun test examples
- Source from actual projects (this blog, vibekit.link, torii.tools, nutter.tools)
- New Astro content collection with tags for language, framework, difficulty level
- Author's specific stack combination (Astro 6 + Tailwind v4 + Bun + Hono) has very few dedicated example resources online

**3. Cheatsheets** — Priority 3
Quick-reference pages for emerging tools where existing docs are thin:
- Tailwind v4 syntax, Bun CLI, Hono routing, Astro 6 content layer API
- Cloudflare Wrangler commands, TypeScript utility types, Rust ownership rules
- Densely packed tables with syntax, patterns, gotchas
- Fast to produce. Currency is the differentiator — Tailwind v4, Astro 6, Bun, Hono are all relatively new

**4. Templates** — Priority 4
Ready-to-use code and config templates:
- Astro project starters, Tailwind v4 CSS configs, tsconfig.json presets
- Cloudflare Worker templates (Hono + D1 + KV + R2)
- GitHub Actions workflow templates, Dockerfiles for Rust services
- Sourced from the author's real working configs. Copy-to-clipboard UX

**5. Glossary** — Priority 5
Developer term definitions focused on the author's niche:
- Web performance terms (SSR, SSG, ISR, hydration, edge computing)
- TypeScript concepts (type narrowing, discriminated unions, conditional types)
- Cloudflare ecosystem terms (Workers, D1, R2, KV, Queues)
- Primarily serves as internal linking infrastructure for other pSEO pages

**6. Directory** — Priority 6 (not recommended)
- Saturated by GitHub "awesome" lists, AlternativeTo, StackShare
- High maintenance, low return. Skip this playbook.

### Indexation Status

| Metric | Value |
|---|---|
| Sitemap URLs | 18 |
| Indexed by Google | 9 (50% gap) |
| Sitelinks | No |
| Knowledge Panel | No |
| Brand query "hmziq blog" | Google auto-corrects to "haziq blog" — site does not rank at all for its own brand name |
| AI Overview citation | No |

**Pages NOT indexed:**
- `/advertise/`, `/contact/`, `/privacy/`, `/terms/`
- `/tags/astro/`, `/tags/cloudflare/`, `/tags/web-dev/`
- `/category/Engineering/`
- `/newsletter/unsubscribe/`

**Other indexation issues:**
- Duplicate indexing of `/categories` and `/categories/` as separate URLs
- Category page snippets show dark-mode UI text instead of useful descriptions
- Google auto-corrects brand name "hmziq blog" to "haziq blog" — site invisible for its own name

### Astro-Specific SEO Tips

- Add `lastmod` dates to sitemap entries via `serialize()` in `astro.config.ts`
- Split sitemap into chunks (posts vs static pages) using `@astrojs/sitemap` chunks config
- Add `changefreq` signals: weekly for blog chunk, monthly for static pages
- Add BreadcrumbList schema to PostLayout and listing pages
- Add CollectionPage schema to `/tags`, `/categories`, and individual tag/category pages
- Implement OG image generation endpoint (`/src/pages/og/[...slug].png.ts`)
- Configure `prefetch: { defaultStrategy: 'viewport' }` in astro config
- Add `article:section` and `article:tag` OG meta properties to PostLayout
- Generate `llms-full.txt` with full post content for AI search engines
- Add hreflang or canonical cross-references if pagination is added
- Add image sitemap extensions for posts with images
- Exclude utility pages (unsubscribe, privacy, terms, advertise) from sitemap via filter

### Recommended Content Formats

- Definitive comparison posts targeting "X vs Y for Z" queries
- Pattern libraries and cheat sheets as standalone pages
- Deep-dive tutorials with runnable code examples
- "Ultimate guide" pillar pages linking to shorter subtopic posts
- Changelog-style posts for library/framework updates ("What's New in Astro 6")
- Case studies with real performance metrics
- Taxonomy-rich list posts ("15 VS Code Extensions for Rust Development in 2026")
- Short "snippet" posts (300-500 words) targeting featured snippets
- Interactive content (quiz pages, configuration generators, playground embeds)
- Repurpose top posts into X/Reddit threads, short video summaries, newsletter deep-dives

### Recommended Internal Linking Strategy

- Add "Related Posts" section (3-5 posts sharing category/tags) to PostLayout
- Build hub/spoke architecture: category hub pages linking to all posts, posts linking back
- Add contextual in-article links with descriptive anchor text
- Add prev/next navigation within categories
- Tag pages should have descriptive intro paragraphs with links to key posts
- Cross-link between tag and category pages
- Add "Popular Posts" or "Featured Posts" section to homepage
- Implement site-wide "Topics" navigation in header/footer linking to top 5-8 category pages
- Add anchor links to heading IDs within posts and show TOC for posts over 1500 words
- Ensure SharePost component links back to canonical URL with `utm_source` tracking

### Author SEO

| Aspect | Status | Fix |
|---|---|---|
| Name consistency | Partial — "hmziqrs" everywhere but it's a handle | Use real display name in `author.name`. Keep "hmziqrs" as social handle. |
| Author page | `/about` exists but thin (30 words, 3 paragraphs) | Expand to 200-400 words. Add Person schema. Add visible social link buttons. |
| Author URL mismatch | Structured data points to `hmziq.rs` but about page is `blog.hmziq.rs/about` | Either change `author.url` to the about page, or add `rel="me"` cross-link from `hmziq.rs`. |
| `rel="me"` on social links | Not present | Add to all social links on about page and post author bylines. |
| Topical authority niches | software-engineering, web-dev, typescript, rust, flutter | Build content clusters in Astro, Cloudflare, TypeScript first. |
| RSS author attribution | Missing | Add `<dc:creator>` to feed items. |
| Homepage Blog schema | No author reference | Add author property pointing to Person entity. |
| About page social links | No visible social profile buttons on about page body | Add social link section with X, GitHub, LinkedIn buttons directly on the about page. |

---

## Summary of All Issues by Severity

### Critical (14)
1. Only 1 published blog post (2 drafts in staging)
2. Homepage has no H1 tag
3. Contact page H1 missing (rendering bug)
4. Unsubscribe page `noindex` not working
5. Unsubscribe page no visible H1 on initial load
6. Unsubscribe page title only 27 chars
7. Tags index title only 18 chars
8. Tags index meta description only 42 chars
9. Atom feed returns HTTP 404 on live site
10. Atom feed self link and id point to staging URL
11. llms.txt URLs are relative, not absolute
12. Average post word count is 601 (need 1500-2500)
13. Blog post meta description only 52 chars and vague

### High (20)
1. Homepage title is 10 chars
2. Homepage meta description is 53 chars
3. About page title is 19 chars, meta desc 96 chars, H1 just "About"
4. About page content only ~30 words
5. Contact page title is 20 chars, meta desc 65 chars
6. Missing HSTS header
7. No BreadcrumbList schema on any page
8. No Organization schema at site level
9. Blog post title is 65 chars (exceeds 60)
10. Blog post content ~592 words (thin for engineering deep-dive)
11. All tag titles too short (18-29 chars)
12. All tag meta descriptions too short (38-44 chars)
13. Zero code examples in any post
14. No images/diagrams in any post body
15. No table of contents on posts
16. Drafts have no subheadings (wall of text)
17. Drafts missing required frontmatter fields
18. All page titles too short (systemic)
19. All listing pages have thin content
20. Only 9 of 18 sitemap URLs indexed

### Medium (18)
1. Sitemap missing lastmod dates
2. Sitemap missing image extensions
3. Uppercase URL: `/category/Engineering/`
4. Missing CSP and X-Frame-Options headers
5. CORS wildcard too permissive
6. All meta descriptions too short on listing pages
7. All tag page H1s have hash prefix (`#tag`)
8. All tag pages have very thin content
9. Categories page thin content
10. Contact page body only ~52 words
11. Unsubscribe page thin content (~10 words)
12. No ItemList schema on category/tag pages
13. Newsletter pages have zero schema
14. Post 1 covers too many topics at surface level
15. Zero internal links between posts
16. Draft 2 and 3 spelling errors
17. llms.txt newsletters section missing from live output
18. BlogPosting schema missing keywords and wordCount

### Low (21)
1. Missing Crawl-delay in robots.txt
2. No disallow for `/newsletter/unsubscribe`
3. No disallow for `/changelog` or `/newsletter`
4. Missing Permissions-Policy header
5. WebSite schema lacks SearchAction
6. No `llms-full.txt` endpoint
7. No `rel="me"` on social links
8. RSS feeds missing author attribution
9. Atom feed has no `<content>` elements
10. Atom feed autodiscovery uses relative path
11. No HowTo or FAQPage schema on tutorial posts
12. No ImageObject schema for cover images
13. No prev/next post navigation within categories
14. Blog post author avatar has empty alt attribute
15. Modal dialog H2s pollute heading hierarchy (all pages)
16. Tag page self-referencing links
17. Tag slugs used as display names
18. Two H1 elements in unsubscribe page DOM
19. Privacy/Terms H1s generic single words
20. JSON API endpoints missing `X-Robots-Tag: noindex`
21. No site-wide schema graph with `@id` references
