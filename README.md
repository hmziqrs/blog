# blog

Reusable blog monorepo with an Astro web app, a Cloudflare Worker API, and an Expo native app.

## Features

- **TypeScript** — Strict type safety across the monorepo
- **Astro 6** — Static SSG with Content Layer API
- **Cloudflare Workers** — Hono API with D1, KV, Queues, and Email Sending
- **React Native + Expo** — Mobile app sharing the same site contract
- **TailwindCSS v4** — Config-in-CSS, no JS config file
- **Turborepo** — Optimized monorepo build system
- **Oxlint + Oxfmt** — Fast linting and formatting
- **Shared Site Contract** — Typed routes and config helpers in `packages/site`

## Getting Started

```bash
bun install
bun run dev
```

- Web: [http://localhost:4321](http://localhost:4321)
- API: [http://localhost:8788](http://localhost:8788) (via `bun run dev:api`)
- Native: use the Expo Go app after running `bun run dev:native`

## Project Structure

```
blog/
├── apps/
│   ├── web/         # Astro 6 static blog (SSG)
│   ├── api/         # Cloudflare Worker — newsletter API (Hono)
│   └── native/      # Mobile app (React Native, Expo)
├── content/
│   ├── posts/       # Markdown blog posts
│   └── media/       # Cover images
├── packages/
│   ├── config/      # Shared TypeScript config
│   ├── site/        # Shared config types, routes, and helpers
│   └── web-components/  # Svelte/ThreeJS web component
├── scripts/         # Operational scripts (newsletter, media pipeline)
├── docs/            # Setup and audit documentation
└── site.config.ts   # Concrete site identity, nav, and pages
```

## Available Scripts

### Development

- `bun run dev` — Start all apps in development mode
- `bun run dev:web` — Start only the Astro web app
- `bun run dev:api` — Start only the Cloudflare Worker
- `bun run dev:native` — Start the Expo development server

### Build & Check

- `bun run build` — Build all applications
- `bun run check` — Run Oxlint and Oxfmt
- `bun run check-types` — Check TypeScript types across all apps
- `bun run qa` — Run lint, format check, Astro checks, and tests

### Database

- `bun run db:migrate:local` — Run D1 migrations locally
- `bun run db:migrate:prod` — Run D1 migrations in production
- `bun run db:migrate:staging` — Run D1 migrations in staging
- `bun run db:query --command "SELECT * FROM subscribers"` — Run a D1 query

### Newsletter

- `bun run newsletter:send` — Trigger a newsletter send
- `bun run newsletter:admin` — View subscriber stats

### Media

- `bun run media:upload` — Upload media to R2
- `bun run media:rewrite` — Rewrite media paths in posts

### Deploy

- `bun run deploy:staging` — Deploy API + web to staging
- `bun run deploy:prod` — Deploy API + web to production

## Reuse Notes

- Update `site.config.ts` to change site identity, URLs, navigation, and optional pages.
- `packages/site` stays generic; concrete copy belongs in `site.config.ts`.
- The web app supports a configurable `basePath`, so the blog can live at `/` or under a path such as `/blog`.
- See `docs/NEWSLETTER_SETUP.md` for setting up the newsletter system.

## Documentation

- `docs/NEWSLETTER_SETUP.md` — Newsletter system setup and testing
