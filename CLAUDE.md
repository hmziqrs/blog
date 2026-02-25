# Blog

Bun monorepo. Astro 6 beta blog (SSG) + Expo native app. Cloudflare Pages.

## Stack

- **Runtime:** Bun, Node 22+
- **Monorepo:** Turborepo
- **Web:** Astro 6 beta, static output, `apps/web/`
- **Native:** Expo, `apps/native/`
- **CSS:** Tailwind v4 via `@tailwindcss/vite` — config lives in CSS only, no JS config file
- **Lint/Fmt:** oxlint (`.oxlintrc.json`) + oxfmt (`.oxfmtrc.json`)
- **TS:** Strict, base config at `packages/config/tsconfig.base.json`

## Structure

```
apps/web/          Astro blog
apps/native/       Expo app
packages/config/   Shared tsconfig
packages/env/      Typed env vars
packages/infra/    Deploy config (Alchemy)
```

## Commands

```bash
bun run dev          # all apps
bun run dev:web      # astro only
bun run dev:native   # expo only
bun run build        # turbo build
bun run deploy       # deploy to CF
bun run check        # oxlint && oxfmt --write
```

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
