# blog

Reusable blog monorepo with an Astro web app and an Expo native app.

## Features

- **TypeScript** - For type safety and improved developer experience
- **Astro** - The web framework for content-driven websites
- **React Native** - Build mobile apps using React
- **Expo** - Tools for React Native development
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **Turborepo** - Optimized monorepo build system
- **Oxlint** - Oxlint + Oxfmt (linting & formatting)
- **Shared Site Contract** - Typed routes and config helpers in `packages/site`

## Getting Started

First, install the dependencies:

```bash
bun install
```

Then, run the development server:

```bash
bun run dev
```

Open [http://localhost:4321](http://localhost:4321) in your browser to see the web application.
Use the Expo Go app to run the mobile application.

## Git Hooks and Formatting

- Format and lint fix: `bun run check`

## Project Structure

```
blog/
├── apps/
│   ├── web/         # Frontend application (Astro)
│   ├── native/      # Mobile application (React Native, Expo)
├── site.config.ts   # Concrete site copy, nav, URL, optional pages
├── packages/
│   ├── config/      # Shared TypeScript config
│   ├── site/        # Shared config types, routes, and helpers
```

## Available Scripts

- `bun run dev`: Start all applications in development mode
- `bun run build`: Build all applications
- `bun run dev:web`: Start only the web application
- `bun run check-types`: Check TypeScript types across all apps
- `bun run dev:native`: Start the React Native/Expo development server
- `bun run check`: Run Oxlint and Oxfmt
- `bun run qa`: Run lint, format check, Astro checks, and tests

## Reuse Notes

- Update `site.config.ts` to change site identity, URLs, nav, and optional pages.
- `packages/site` stays generic; concrete copy belongs in `site.config.ts`.
- The web app supports a configurable `basePath`, so the blog can live at `/` or under a path such as `/blog`.
