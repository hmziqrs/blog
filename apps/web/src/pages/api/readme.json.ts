import type { APIRoute } from "astro";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { type ApiMeta, ReadmeSchema } from "../../utils/api-schemas";

export const apiMeta = {
  operationId: "getReadme",
  summary: "README content",
  description: "Returns the repository README as raw markdown.",
  tags: ["meta"],
  response: ReadmeSchema,
} satisfies ApiMeta;

export const GET: APIRoute = () => {
  const monorepoRoot = path.resolve(fileURLToPath(import.meta.url), "../../../../../../");
  const readmePath = path.join(monorepoRoot, "README.md");

  if (!fs.existsSync(readmePath)) {
    return new Response(JSON.stringify({ error: "README.md not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const content = fs.readFileSync(readmePath, "utf-8");
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch?.[1] ?? "README";

  return new Response(
    JSON.stringify({ title, source: "https://github.com/hmziqrs/blog/blob/main/README.md", content }),
    { headers: { "Content-Type": "application/json" } },
  );
};
