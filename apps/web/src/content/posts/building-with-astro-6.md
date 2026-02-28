---
title: "Building a Static Blog with Astro 6"
description: "How I set up this blog using Astro 6 beta, Tailwind v4, DaisyUI 5, and Cloudflare Pages."
date: 2026-02-26
category: "engineering"
tags: ["astro", "tailwind", "cloudflare", "bun"]
draft: false
---

## Why Astro

Astro generates zero-JS static HTML by default. For a blog, that means fast page loads and no hydration overhead.

## Stack

- **Astro 6** — static SSG, Content Layer API
- **Tailwind v4** — config in CSS only, no JS file
- **DaisyUI 5** — component library via `@plugin`
- **Pagefind** — fully static search, indexed at build time
- **Cloudflare Pages** — edge CDN, free tier, auto-deploy on push

## Content Collections

Posts live in `src/content/posts/` as Markdown files. Frontmatter is validated with Zod 4:

```typescript
import { defineCollection } from "astro:content";
import { z } from "zod";

const posts = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/posts" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    category: z.enum(["engineering", "tutorials", "opinions", "tools", "news"]),
    tags: z.array(z.string()),
    draft: z.boolean().default(false),
  }),
});
```

A Zod error at build time is a typo-proof schema guard.

## Deployment

Push to `main` → GitHub Actions runs `bun run qa` → Cloudflare Pages builds and deploys. The whole pipeline takes under two minutes.
