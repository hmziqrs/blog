# Align `apps/api/` with Cloudflare's recommended local dev + testing setup

## Context

The `apps/api/` Hono Worker already does the right things at a high level: `wrangler dev` for local execution, `.dev.vars` for local secrets, a `migrations/` folder, and `db:migrate:local` wiring. Two gaps versus Cloudflare's official guidance at https://developers.cloudflare.com/workers/development-testing/ remain:

1. **Tests run under `bun:test`**, which only validates pure-TS helpers (email normalization, Zod schemas). It cannot exercise routes, D1, CORS, or the SEND_EMAIL binding. Cloudflare's official testing path is `@cloudflare/vitest-pool-workers`, which runs specs inside the real `workerd` runtime with `cloudflare:test` helpers (`env`, `applyD1Migrations`, `SELF`, `createExecutionContext`).
2. **Wrangler is on v3.90**; v4 is current and required by recent versions of `@cloudflare/vitest-pool-workers` and the `@cloudflare/workers-types` catalog entry.

Smaller hygiene items: there's no `[dev]` block in `wrangler.toml` (port is on the CLI), and `compatibility_date` is a year stale.

User confirmed both decisions: switch tests to `vitest-pool-workers` and bump wrangler to v4.

Outcome: the api can be developed and tested locally with the toolchain Cloudflare recommends, including binding-level integration tests against an isolated, migrated D1 per test file.

## Two storage scopes, one engine

This plan touches two distinct Cloudflare-managed local environments. They share the same `workerd` SQLite engine — neither is a mock or a hack.

| Scope                        | Where data lives                                    | How to inspect                                                                              | Tooling                                                                                                    |
| ---------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `wrangler dev` (interactive) | `.wrangler/state/v3/d1/...` — persisted across runs | **Local Explorer** dashboard (press `e` in the dev session, or hit `/cdn-cgi/explorer/api`) | `wrangler dev`, `wrangler d1 execute --local`, `wrangler d1 migrations apply --local`                      |
| `vitest run` (tests)         | Ephemeral, isolated per test file                   | n/a — assertions in spec                                                                    | `@cloudflare/vitest-pool-workers`, `applyD1Migrations(env.DB, env.TEST_MIGRATIONS)` from `cloudflare:test` |

**Local Explorer** is the recent open-beta UI Cloudflare shipped to introspect simulated KV / R2 / D1 / Durable Objects / Workflows during `wrangler dev`. It requires no config — wrangler v4 is enough — and is what makes the dev flow first-class without third-party tools like Localflare. ([Cloudflare blog](https://blog.cloudflare.com/cf-cli-local-explorer/))

**`@cloudflare/vitest-pool-workers` with `applyD1Migrations`** is Cloudflare's official testing path. It boots `workerd` (same runtime as prod), wires `env.DB` to a real local D1, applies the same `migrations/*.sql` we ship to prod, and isolates storage per test file. There is no parallel "test database" being maintained — the migrations directory IS the source of truth, both for `wrangler d1 migrations apply` (dev/prod) and `readD1Migrations` (tests).

## Scope

In:

- `apps/api/wrangler.toml` — `[dev]` block, refreshed `compatibility_date`.
- `apps/api/package.json` — wrangler v4 (unlocks Local Explorer), vitest deps, `test` script change.
- `apps/api/vitest.config.ts` — new.
- `apps/api/test/` — new dir: `apply-migrations.ts`, `tsconfig.json`, `env.d.ts`, ports of existing specs, plus one new route+D1 integration spec.
- `apps/api/src/__tests__/newsletter.test.ts` — delete (replaced under `test/`).
- `apps/api/tsconfig.json` — drop `bun-types` from types (no longer used by api).
- Root `package.json` — only if the wrangler v4 bump warrants a CLI version bump there too (it isn't a direct dep of root, so likely no change).

Out:

- Switching to `wrangler.jsonc` (toml is supported, no value in churning).
- Auto-generated `worker-configuration.d.ts` via `generate_types = true` — would conflict with the hand-written `src/env.ts`. Defer.
- Touching `scripts/__tests__` — those stay on `bun:test`; only the api swaps.
- Adding a Vite plugin / migrating away from `wrangler dev` — Cloudflare's docs only recommend Vite for frontend-heavy projects.

## Changes

### 1. `apps/api/wrangler.toml`

- Bump `compatibility_date` from `"2025-04-01"` to `"2026-04-01"` (or current).
- Add `[dev]` block so config — not the CLI flag — owns the dev port:

```toml
[dev]
port = 8788
ip = "localhost"
```

- Drop `--port 8788` from the `dev` script in `apps/api/package.json` once the block is in place.
- Leave the `[env.staging]` block, prod `[vars]`, D1 placeholder ID, and `[[send_email]]` as-is.

### 2. `apps/api/package.json`

```jsonc
{
  "scripts": {
    "dev": "wrangler dev",
    "build": "wrangler deploy --dry-run --outdir dist",
    "deploy": "wrangler deploy",
    "check-types": "tsc --noEmit",
    "test": "vitest run",
  },
  "devDependencies": {
    "@cloudflare/vitest-pool-workers": "^0.9.0",
    "@cloudflare/workers-types": "catalog:",
    "typescript": "catalog:",
    "vitest": "^4.1.0",
    "wrangler": "^4.0.0",
  },
}
```

- Drop `bun-types` from devDependencies (only used by the test file we're replacing).
- Versions above are floors per Cloudflare's "Write your first test" doc; `bun install` will resolve the latest matching.

### 3. `apps/api/vitest.config.ts` (new)

Modeled on Cloudflare's official D1 fixture (`workers-sdk/fixtures/vitest-pool-workers-examples/d1/vitest.config.ts`):

```ts
import path from "node:path";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig(async () => {
  const migrations = await readD1Migrations(path.join(__dirname, "migrations"));
  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: "./wrangler.toml" },
        miniflare: {
          bindings: { TEST_MIGRATIONS: migrations },
        },
      }),
    ],
    test: {
      setupFiles: ["./test/apply-migrations.ts"],
    },
  };
});
```

Notes:

- No `environment: "production"` because the top-level wrangler config IS production; staging is a named env we don't need in tests.
- `readD1Migrations()` reads `migrations/*.sql`, surfaced to tests via the synthetic `TEST_MIGRATIONS` binding.

### 4. `apps/api/test/apply-migrations.ts` (new)

Verbatim from the Cloudflare fixture, retargeted to our binding:

```ts
import { applyD1Migrations, env } from "cloudflare:test";

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
```

Setup files run outside per-test-file isolation; `applyD1Migrations` is idempotent.

### 5. `apps/api/test/env.d.ts` (new)

```ts
declare module "cloudflare:test" {
  interface ProvidedEnv {
    DB: D1Database;
    TEST_MIGRATIONS: import("cloudflare:test").D1Migration[];
    TURNSTILE_SECRET_KEY: string;
    NEWSLETTER_SEND_SECRET: string;
    EMAIL_FROM_ADDRESS: string;
    ALLOWED_ORIGIN: string;
    SITE_URL: string;
    ENVIRONMENT: string;
  }
}
```

This shape is what `cloudflare:test` expects for typing `env`. Mirrors `Bindings` in `apps/api/src/env.ts` plus the synthetic `TEST_MIGRATIONS`.

### 6. `apps/api/test/tsconfig.json` (new)

```jsonc
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "types": ["@cloudflare/vitest-pool-workers"],
  },
  "include": ["./**/*.ts", "../src/**/*.ts"],
}
```

The `@cloudflare/vitest-pool-workers` types entry provides `cloudflare:test` and `cloudflare:workers` typings.

### 7. Test ports + new integration spec

Move `apps/api/src/__tests__/newsletter.test.ts` → `apps/api/test/newsletter.test.ts`. Only change required is the import line:

```ts
import { describe, expect, test } from "vitest";
```

The rest (`normalizeEmail`, schema validation) is framework-agnostic.

Then add `apps/api/test/subscribe.route.test.ts` to actually exercise the new infra — this is the entire reason for switching:

```ts
import { env } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import app from "../src/index";

describe("POST /api/newsletter/subscribe", () => {
  it("rejects requests without a Turnstile token", async () => {
    const res = await app.fetch(
      new Request("http://localhost/api/newsletter/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "user@example.com", token: "" }),
      }),
      env,
    );
    expect(res.status).toBe(400);
  });

  // Add a happy-path test once a Turnstile mock seam is in place.
});
```

This proves: D1 is migrated, `env.DB` is live, the Hono app boots inside workerd, and the route returns the expected validation error.

### 8. `apps/api/tsconfig.json`

Drop `bun-types`:

```jsonc
{
  "extends": "../../packages/config/tsconfig.base.json",
  "compilerOptions": {
    "types": ["@cloudflare/workers-types"],
  },
  "include": ["src/**/*"],
  "exclude": ["dist", "node_modules", "test"],
}
```

`test` is excluded so it doesn't drag in `cloudflare:test` types into the production build graph; the test dir has its own `tsconfig.json`.

### 9. `apps/api/src/__tests__/`

Delete the directory once specs are ported.

## Critical files to read before editing

- `apps/api/wrangler.toml` — for the `[dev]` insertion point and to confirm the staging block isn't accidentally affected.
- `apps/api/src/index.ts` — confirms `app` is the default export consumed by tests.
- `apps/api/src/env.ts` — `Bindings` type drives `test/env.d.ts`.
- `apps/api/src/modules/newsletter/routes/subscribe.ts` — drives the integration spec; need to confirm the 400 path before writing the assertion.
- `apps/api/migrations/0001_initial.sql` — `readD1Migrations()` will read it; confirm it's runnable in workerd's SQLite (no Postgres-isms).
- Root `package.json` — `db:migrate:local` script stays as-is; turbo-driven `bun run test` still routes into the api workspace via `turbo test`.

## Verification

1. `cd apps/api && bun install` — installs vitest, pool-workers, wrangler v4.
2. `bun run check-types` from the api dir — confirms `tsconfig.json` and `test/tsconfig.json` resolve cleanly.
3. `bun run test` from the api dir — vitest spins up workerd, applies migrations from `migrations/` via `applyD1Migrations`, runs both specs. Expect: existing helper tests pass; the new route test returns 400.
4. `bun run dev:api` from repo root — confirms the `[dev]` block port is honored (still :8788) and the worker boots.
5. **Local Explorer smoke test**: with the dev server running, press `e` in the wrangler terminal — a browser tab should open showing the local D1 (`DB`) seeded by `db:migrate:local`. Confirm the `subscribers` table is visible.
6. `bun run db:migrate:local` — applies migrations into `.wrangler/state/` so Local Explorer has data to show. Sanity-check this still works through wrangler v4.
7. `bun run qa` from repo root — full lint + fmt + typecheck + turbo test.
8. Manual: `curl -X POST http://localhost:8788/api/newsletter/subscribe -H 'content-type: application/json' -d '{"email":"a@b.com","token":""}'` should return 400 (matches the integration test).

## Risks

- **Wrangler v4 default flag changes** — mostly affects deploy flags, not `dev`. If `bun run dev:api` errors, the fix is usually a single CLI flag rename; not a structural problem.
- **`@cloudflare/vitest-pool-workers` peerDeps** — pins a vitest major. If `^4.1.0` is wrong for the published pool, fall back to whatever the pool's peer range demands; the test config shape doesn't change.
- **Hono `app.fetch(req, env)` signature** — confirmed by reading `src/index.ts` (default export is `app`); if the route test fails to reach the handler, switch to importing via `cloudflare:test`'s `SELF` and using `SELF.fetch(...)` instead.
