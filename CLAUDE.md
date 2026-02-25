# Tank Blog

Monorepo: Astro 6 beta static blog with Expo native app, deployed to Cloudflare Pages (SSG).

## Stack

- **Runtime:** Bun, Node 22+
- **Monorepo:** Turborepo (`turbo dev`, `turbo build`)
- **Web:** Astro 6 beta (SSG, `apps/web/`), static output to `dist/`
- **Native:** Expo/React Native (`apps/native/`)
- **CSS:** Tailwind v4 (CSS-only config via `@tailwindcss/vite`), no `tailwind.config` file
- **Lint/Fmt:** oxlint + oxfmt (root config files `.oxlintrc.json`, `.oxfmtrc.json`)
- **Deploy:** Cloudflare Pages via Alchemy (`packages/infra/alchemy.run.ts`)
- **TS:** Strict, shared base config in `packages/config/tsconfig.base.json`

## Structure

```
apps/web/          Astro 6 blog (SSG, Cloudflare Pages)
apps/native/       Expo app (drawer + tabs)
packages/config/   Shared tsconfig
packages/env/      Typed env vars (web + native)
packages/infra/    Alchemy deploy config
```

## Commands

```bash
bun run dev          # turbo dev (all apps)
bun run dev:web      # astro dev only
bun run dev:native   # expo dev only
bun run build        # turbo build
bun run deploy       # alchemy deploy to CF
bun run check        # oxlint && oxfmt --write
```

## Key Conventions

- Astro 6: No `Astro.glob()` — use `getCollection()` / `import.meta.glob()`. Content Layer API only. `render()` imported from `astro:content`. `<ClientRouter />` not `<ViewTransitions />`.
- Tailwind v4: All config in CSS (`@theme {}`, `@plugin`). No JS config file.
- DaisyUI 5 (planned): Load via `@plugin "daisyui"` in CSS.
- Static output (SSG). No server adapter needed for the blog.
- Zod 4 only (Astro 6 requirement).

## Plan

See `plan.md` for the full build plan. Current state: scaffolded via Better-T-Stack with basic layout, header, and index page. Next: DaisyUI 5, content collections, post/tag/category pages, SEO, tests.
