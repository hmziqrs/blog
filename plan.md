# Blog Build Plan

Astro 6 beta · Tailwind v4 · DaisyUI 5 · Oxlint · Oxfmt · Bun · Cloudflare Pages · SSG

## Breaking Changes Reference

**Astro 6:** Requires Node 22+. Zod 4 only. `Astro.glob()` removed — use `import.meta.glob()` or `getCollection()`. `<ViewTransitions />` removed — use `<ClientRouter />`. Legacy content collections removed — Content Layer API only. `type: 'content'` gone. Entries use `id` not `slug`. `render()` imported from `astro:content`, not called on entry. CSP stable via `csp: true`.

**Tailwind v4:** No `tailwind.config` file. All config in CSS via `@import "tailwindcss"` and `@theme {}`. Plugins loaded via `@plugin` in CSS. `@astrojs/tailwind` deprecated — use `@tailwindcss/vite` directly. Auto-detects template files.

**DaisyUI 5:** Loaded via `@plugin "daisyui"` in CSS. `card-bordered` renamed to `card-border`.

**Oxfmt:** Alpha. 100% Prettier conformance. Supports JS/TS/JSX/TSX/JSON/YAML/TOML/HTML/Vue/CSS/SCSS/Less/Markdown/MDX. Config via `.oxfmtrc.jsonc`.

## Phase 1: Scaffold

```bash
node -v  # must be 22+
bunx create-astro@latest blog --ref next  # empty template, TS strict
cd blog && bun dev
```

Verify: `localhost:4321` loads. `package.json` shows `astro` 6.x.

## Phase 2: Tailwind v4 + DaisyUI 5

```bash
bun add tailwindcss @tailwindcss/vite
bun add -D daisyui@latest @tailwindcss/typography
```

`astro.config.mjs`:

```typescript
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://yourdomain.com",
  csp: true,
  vite: {
    plugins: [tailwindcss()],
  },
});
```

`src/styles/global.css`:

```css
@import "tailwindcss";

@plugin "daisyui";
@plugin "@tailwindcss/typography";

@theme {
  --color-olive: oklch(0.45 0.05 130);
  --color-steel: oklch(0.55 0.01 260);
  --color-sand: oklch(0.82 0.04 80);
}
```

Import `../styles/global.css` in base layout. Set `data-theme="night"` on `<html>`.

Verify: DaisyUI `btn btn-primary` renders styled. `text-olive` applies. No `tailwind.config` file exists.

## Phase 3: Oxlint + Oxfmt

```bash
bun add -D oxlint oxfmt
```

`package.json` scripts:

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check",
    "lint": "oxlint",
    "lint:fix": "oxlint --fix",
    "fmt": "oxfmt",
    "fmt:check": "oxfmt --check",
    "test": "bun test",
    "test:coverage": "bun test --coverage",
    "qa": "bun run lint && bun run fmt:check && bun run check && bun test"
  }
}
```

`.oxlintrc.json` (optional — works zero-config):

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "categories": {
    "correctness": "error",
    "suspicious": "warn",
    "pedantic": "off"
  }
}
```

`.oxfmtrc.jsonc`:

```jsonc
{
  "$schema": "./node_modules/oxfmt/configuration_schema.json",
  "printWidth": 100,
  "singleQuote": false,
  "semi": true
}
```

VS Code `.vscode/settings.json`:

```json
{
  "editor.defaultFormatter": "oxc.oxc-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.oxfmt": "always"
  },
  "oxc.fmt.experimental": true
}
```

Verify: `bun run lint` and `bun run fmt` complete in milliseconds.

## Phase 4: Layouts + Structure

```
src/
├── components/
│   ├── Header.astro
│   ├── Footer.astro
│   ├── PostCard.astro
│   ├── TagBadge.astro
│   └── CategoryNav.astro
├── content/
│   └── posts/
├── layouts/
│   ├── BaseLayout.astro
│   └── PostLayout.astro
├── pages/
│   ├── index.astro
│   ├── about.astro
│   ├── posts/[...slug].astro
│   ├── tags/
│   │   ├── index.astro
│   │   └── [tag].astro
│   └── category/
│       └── [category].astro
├── styles/
│   └── global.css
└── __tests__/
    ├── collections.test.ts
    ├── tags.test.ts
    └── utils.test.ts
```

`BaseLayout.astro`: `<html data-theme="night">`, `<head>` with meta slots, global CSS import, header, footer, `<slot />`. Use `<ClientRouter />` for transitions.

`PostLayout.astro`: Title, date, tags, reading time, `<article class="prose dark:prose-invert">` wrapping `<slot />`.

`Header.astro`: DaisyUI `navbar`. `Footer.astro`: DaisyUI `footer`.

## Phase 5: Content Collections

`src/content.config.ts`:

```typescript
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const posts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/posts" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    category: z.enum(["engineering", "tutorials", "opinions", "tools", "news"]),
    tags: z.array(z.string()),
    draft: z.boolean().default(false),
    cover: z.string().optional(),
  }),
});

export const collections = { posts };
```

Example post `src/content/posts/hello-world.md`:

```markdown
---
title: "Welcome to the Blog"
description: "First post. What this blog is about."
date: 2026-01-01
category: "news"
tags: ["meta", "introduction"]
draft: false
---

First post content.
```

Query pattern:

```typescript
---
import { getCollection } from "astro:content";
const posts = await getCollection("posts", ({ data }) => !data.draft);
const sorted = posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
---
```

Verify: Homepage lists posts. Breaking frontmatter triggers Zod error.

## Phase 6: Post + Tag + Category Pages

`src/pages/posts/[...slug].astro`:

```typescript
---
import { getCollection, render } from "astro:content";
import PostLayout from "../../layouts/PostLayout.astro";

export async function getStaticPaths() {
  const posts = await getCollection("posts", ({ data }) => !data.draft);
  return posts.map((post) => ({
    params: { slug: post.id },
    props: { post },
  }));
}

const { post } = Astro.props;
const { Content } = await render(post);
---

<PostLayout frontmatter={post.data}>
  <Content />
</PostLayout>
```

`tags/index.astro`: List all tags with counts. `tags/[tag].astro`: Filter posts by tag. `category/[category].astro`: Filter posts by category. `PostCard.astro`: DaisyUI `card`. `TagBadge.astro`: DaisyUI `badge` linking to `/tags/{tag}`.

Verify: Post pages render with prose. Tag/category pages filter correctly. No 404s.

## Phase 7: SEO + RSS + Search

```bash
bunx astro add sitemap
bun add @astrojs/rss
bun add -D pagefind
```

Create `src/pages/rss.xml.ts`. Add meta tags (title, description, og:*, twitter:card) to BaseLayout. Add canonical URLs. Add `postbuild` script: `"postbuild": "pagefind --site dist"`.

`public/robots.txt`:

```
User-agent: *
Allow: /
Sitemap: https://yourdomain.com/sitemap-index.xml
```

Verify: `dist/sitemap-index.xml` exists after build. `dist/rss.xml` valid. Search returns results. Meta tags in page source.

## Phase 8: Tests (Bun Test Runner)

Bun's built-in test runner. Jest-compatible API. Picks up `*.test.ts` / `*.spec.ts`. Zero config.

`src/__tests__/collections.test.ts`:

```typescript
import { describe, test, expect } from "bun:test";
import { z } from "astro:content";

const postSchema = z.object({
  title: z.string(),
  description: z.string(),
  date: z.coerce.date(),
  updated: z.coerce.date().optional(),
  category: z.enum(["engineering", "tutorials", "opinions", "tools", "news"]),
  tags: z.array(z.string()),
  draft: z.boolean().default(false),
  cover: z.string().optional(),
});

describe("Post Schema", () => {
  test("accepts valid frontmatter", () => {
    const valid = {
      title: "Building a CLI with Bun",
      description: "Deep dive",
      date: "2026-01-01",
      category: "tutorials",
      tags: ["bun", "cli"],
    };
    expect(() => postSchema.parse(valid)).not.toThrow();
  });

  test("rejects missing title", () => {
    expect(() =>
      postSchema.parse({ description: "x", date: "2026-01-01", category: "news", tags: [] })
    ).toThrow();
  });

  test("rejects invalid category", () => {
    expect(() =>
      postSchema.parse({
        title: "x",
        description: "x",
        date: "2026-01-01",
        category: "invalid",
        tags: [],
      })
    ).toThrow();
  });

  test("coerces date string to Date", () => {
    const result = postSchema.parse({
      title: "x",
      description: "x",
      date: "2026-01-01",
      category: "news",
      tags: [],
    });
    expect(result.date).toBeInstanceOf(Date);
  });

  test("defaults draft to false", () => {
    const result = postSchema.parse({
      title: "x",
      description: "x",
      date: "2026-01-01",
      category: "news",
      tags: [],
    });
    expect(result.draft).toBe(false);
  });
});
```

`src/__tests__/tags.test.ts`:

```typescript
import { describe, test, expect } from "bun:test";

function extractUniqueTags(posts: { data: { tags: string[] } }[]): string[] {
  return [...new Set(posts.flatMap((p) => p.data.tags))].sort();
}

describe("Tag Extraction", () => {
  test("extracts unique sorted tags", () => {
    const posts = [
      { data: { tags: ["typescript", "tooling"] } },
      { data: { tags: ["typescript", "testing"] } },
    ];
    expect(extractUniqueTags(posts)).toEqual(["testing", "tooling", "typescript"]);
  });

  test("handles empty tags", () => {
    expect(extractUniqueTags([{ data: { tags: [] } }])).toEqual([]);
  });
});
```

`src/__tests__/utils.test.ts`: Test any utility functions (reading time, slug helpers, etc.).

Verify: `bun test` all pass. `bun test --coverage` shows coverage.

## Phase 9: Quality Gate

```bash
bun run qa        # lint + fmt:check + astro check + tests
bun run build     # zero errors
bun run preview   # browse every page
```

Lighthouse 90+ on all four categories. Mobile responsive at 375px.

## Phase 10: Cloudflare Pages Deploy

Push to GitHub. CF Dashboard → Pages → Connect repo.

Build settings:
- Command: `bun run build && bunx pagefind --site dist`
- Output: `dist`
- Env: `NODE_VERSION` = `22`

Fallback if Bun unavailable in CF build image: `npx astro build && npx pagefind --site dist`.

Verify: Live site loads. Push triggers auto-redeploy. Search works. RSS accessible.

## Phase 11: Domain + Hardening

Custom domain via CF Pages (auto-SSL). Update `site` in `astro.config.mjs`.

`public/_headers`:

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
```

`csp: true` in astro config handles CSP with auto-generated script/style hashes.

Create `src/pages/404.astro`. Add favicon to `public/`. Default OG image + per-post via `cover` frontmatter. Enable CF Web Analytics from dashboard.

Verify: HTTPS loads. `curl -I` shows security headers. Social share preview cards render. `/nonexistent` shows 404 page.

## Phase 12: Content Workflow

```
1. Create .md in src/content/posts/
2. Write frontmatter + content
3. bun dev → preview
4. bun run qa
5. git commit && git push
6. CF auto-deploys
```

## CI: GitHub Actions

`.github/workflows/ci.yml`:

```yaml
name: CI
on: [push, pull_request]
jobs:
  qa:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install
      - run: bun run lint
      - run: bun run fmt:check
      - run: bun run check
      - run: bun test
      - run: bun run build
```

CF Pages deploys on `main`. CI gates PRs.
