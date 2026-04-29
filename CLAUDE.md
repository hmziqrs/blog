# Blog

Bun monorepo. Astro 6 blog (SSG) + Expo native app. Cloudflare Pages.

## Stack

- **Runtime:** Bun, Node 22.12+
- **Monorepo:** Turborepo
- **Web:** Astro 6, static output, `apps/web/`
- **Native:** Expo, `apps/native/`
- **CSS:** Tailwind v4 via `@tailwindcss/vite` — config lives in CSS only, no JS config file
- **Lint/Fmt:** oxlint (`.oxlintrc.json`) + oxfmt (`.oxfmtrc.json`)
- **TS:** Strict, base config at `packages/config/tsconfig.base.json`

## Structure

```
apps/web/          Astro 6 blog (SSG)
apps/api/          Cloudflare Worker — newsletter API (Hono)
apps/native/       Expo app
site.config.ts     Concrete site identity, nav, and optional page content
packages/config/   Shared tsconfig
packages/site/     Shared config types, routes, and helpers
```

## Commands

```bash
bun run dev          # all apps
bun run dev:web      # astro only
bun run dev:api      # worker only
bun run dev:native   # expo only
bun run build        # turbo build
bun run check        # oxlint && oxfmt --write
bun run qa           # lint + fmt + typecheck + test

# deploy
bun run deploy:staging  # migrate + api + web
bun run deploy:prod

# db
bun run db:migrate:local
bun run db:migrate:prod
bun run db:query --command "SELECT * FROM subscribers"

# newsletter
bun run newsletter:send
bun run newsletter:admin
```

## Newsletter API

The `apps/api/` Hono Worker owns `/api/newsletter/*` endpoints. Astro dev proxies these via Vite. Same-origin in production via Workers Routes.

## Astro 6 Rules

- No `Astro.glob()` — use `getCollection()` or `import.meta.glob()`
- Content Layer API only. No `type: 'content'`. Entries use `id` not `slug`
- `render()` imported from `astro:content`, not called on entry
- `<ClientRouter />` not `<ViewTransitions />`
- Zod 4 only

## Tailwind v4 Rules

- All config in CSS: `@import "tailwindcss"`, `@theme {}`, `@plugin`
- No `tailwind.config` file. No `@astrojs/tailwind`
- DaisyUI 5 loaded via `@plugin "daisyui"` in CSS
