import type { APIRoute } from "astro";
import { type ApiMeta } from "../../utils/api-schemas";
import { buildOpenApiSpec, globToOpenApiPath } from "../../utils/openapi";

// Discover all API endpoint modules at build time
const apiModules = import.meta.glob<{ apiMeta?: ApiMeta}>("./**/*.json.ts", {
  eager: true,
});

export const GET: APIRoute = () => {
  const entries: Array<{ path: string; meta: ApiMeta }> = [];

  for (const [relativePath, mod] of Object.entries(apiModules)) {
    // Skip self (the openapi endpoint)
    if (relativePath.includes("openapi.json.ts")) continue;
    // Skip modules without apiMeta
    if (!mod.apiMeta) continue;

    entries.push({
      path: globToOpenApiPath(relativePath),
      meta: mod.apiMeta,
    });
  }

  const spec = buildOpenApiSpec(entries);

  return new Response(JSON.stringify(spec, null, 2), {
    headers: { "Content-Type": "application/json" },
  });
};
