import { z } from "zod";
import type { ApiMeta } from "./api-schemas";
import { siteConfig } from "../config/site";

/** Recursively strip $schema and $id — not valid inside OpenAPI Schema Object */
function stripMeta(obj: unknown): unknown {
  if (typeof obj !== "object" || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(stripMeta);
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (key === "$schema" || key === "$id") continue;
    result[key] = typeof value === "object" && value !== null ? stripMeta(value) : value;
  }
  return result;
}

/** Convert a Zod schema to an OpenAPI-compatible JSON Schema */
export function toOpenApiSchema(zodSchema: z.ZodTypeAny): unknown {
  const jsonSchema = z.toJSONSchema(zodSchema);
  return stripMeta(jsonSchema);
}

/**
 * Convert Astro file glob path to OpenAPI path.
 * "./category/[category].json.ts" → "/api/category/{category}.json"
 */
export function globToOpenApiPath(relativePath: string): string {
  return (
    "/api/" +
    relativePath
      .replace(/^\.\//, "")
      .replace(/\.json\.ts$/, ".json")
      .replace(/\[\.\.\.(\w+)\]/g, "{$1}")
      .replace(/\[(\w+)\]/g, "{$1}")
  );
}

/** Build OpenAPI parameter objects from apiMeta.parameters */
function buildParameters(meta: ApiMeta): Array<Record<string, unknown>> {
  const params: Array<Record<string, unknown>> = [];
  if (!meta.parameters) return params;

  for (const [name, zodSchema] of Object.entries(meta.parameters)) {
    const jsonSchema = stripMeta(z.toJSONSchema(zodSchema as z.ZodTypeAny)) as Record<
      string,
      unknown
    >;
    params.push({
      name,
      in: "path",
      required: true,
      schema: jsonSchema,
      description: (jsonSchema.description as string) ?? "",
    });
  }

  return params;
}

/** Assemble the full OpenAPI 3.1 spec from discovered endpoint metadata */
export function buildOpenApiSpec(
  entries: Array<{ path: string; meta: ApiMeta }>,
): Record<string, unknown> {
  const paths: Record<string, Record<string, unknown>> = {};

  for (const { path, meta } of entries) {
    const parameters = buildParameters(meta);
    const responseSchema = toOpenApiSchema(meta.response);

    paths[path] = {
      get: {
        operationId: meta.operationId,
        summary: meta.summary,
        ...(meta.description && { description: meta.description }),
        ...(meta.tags && { tags: meta.tags }),
        ...(parameters.length > 0 && { parameters }),
        responses: {
          "200": {
            description: meta.description ?? meta.summary,
            content: {
              "application/json": {
                schema: responseSchema,
              },
            },
          },
        },
      },
    };
  }

  return {
    openapi: "3.1.0",
    info: {
      title: `${siteConfig.name} API`,
      version: "1.0.0",
      description: `JSON API for ${siteConfig.name}. All endpoints are statically generated at build time.`,
      contact: {
        name: siteConfig.author.name,
        ...(siteConfig.author.url && { url: siteConfig.author.url }),
      },
    },
    servers: [{ url: siteConfig.publicSiteUrl, description: "Production" }],
    paths,
  };
}
