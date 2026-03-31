# Reusable Blog Next Changes

## Summary

Turn the current Astro app into a reusable blog module that can be mounted at `/` or under a configurable base path, while moving site-specific content out of `packages/site` and making non-blog pages optional. Keep `packages/site` as the shared contract layer for types, route helpers, and defaults, and introduce an app-level override config as the single place each future site customizes branding, copy, nav, and page availability.

## Key Changes

- Add configurable base-path support for all generated links and route helpers.
- Introduce a `basePath` field in the app-level site/blog config.
- Update shared route builders to compose paths from `basePath` instead of assuming root paths.
- Replace remaining hardcoded root assumptions in SEO, RSS, robots, OG image references, nav, badges, cards, taxonomy pages, and 404 links.
- Move concrete site content out of `packages/site` into an app-level config file.
- `packages/site` should keep only types, route/path helpers, config-shape helpers, and optionally minimal defaults.
- The web app should own actual site identity and copy: name, URL, home copy, footer copy, about/contact/legal content, nav items, and enabled pages.
- Native should consume the same app-owned config through a thin import, not its own duplicated constants.
- Make non-blog pages optional.
- Add boolean or presence-based config for `about`, `contact`, `privacy`, and `terms`.
- Hide disabled pages from header/footer nav.
- Ensure page generation is conditional or routed to the host shell only when enabled.
- Keep the reusable core centered on posts, post detail, tags, categories, RSS, sitemap, robots, and SEO metadata.
- Finish generalizing taxonomy behavior.
- Keep categories as free-form strings.
- Ensure category navigation derives from content/config instead of embedded lists.
- Remove any remaining assumptions that future blogs will use the same taxonomy labels or route exposure.
- Separate “blog engine” concerns from “site shell” concerns.
- Keep reusable blog rendering, content queries, SEO, and taxonomy in the blog layer.
- Treat legal/about/contact copy as host-site configuration sitting on top of that layer.
- Do not deepen DaisyUI/site-brand decisions into the shared contract package.

## Public Interfaces / Config Changes

- Add an app-level config module with fields for:
- `name`, `siteUrl`, `basePath`
- `blog.homeTitle`, `blog.homeDescription`
- nav items
- footer copy
- enabled optional pages
- optional page content for `about`, `contact`, `privacy`, `terms`
- Narrow `packages/site` to:
- config interfaces/types
- route helper factory or route helpers that accept config/base path
- page-title helper and shared pure utilities
- Keep post frontmatter schema unchanged except for the already-generalized free-form `category: string`.

## Test Plan

- Link generation works at both `basePath="/"` and a non-root value such as `"/blog"`.
- Header, footer, badges, cards, RSS item links, robots sitemap entry, canonical URLs, OG URLs, and structured data all reflect the configured base path and site URL.
- Disabling optional pages removes them from nav and does not leave broken links.
- Enabling optional pages renders correct copy from the app-level config.
- Posts, tags, and categories still build correctly with arbitrary category values.
- Native Expo config still resolves shared site identity from the new app-level config source.
- Validation target: `bun run fmt:check`, `bun run lint`, `bun run -F web check`, `bun run -F web build`, and `bunx expo config --type public`.

## Assumptions

- Base-path support should be implemented now, not deferred to a later package extraction.
- About/contact/privacy/terms remain available as optional host-configured pages rather than mandatory blog pages.
- Site-specific copy should move out of `packages/site`; each app/site should own its own concrete config while sharing the same schema/utilities.
- This phase is refactor-focused; no CMS, remote content source, or package publishing work is included yet.
