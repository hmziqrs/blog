import type { APIRoute } from "astro";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

function findReadme(): string | null {
  // Try resolving from this file's location first
  const candidates = [
    path.resolve(fileURLToPath(import.meta.url), "../../../../../README.md"),
    // Fallback: during Astro build, import.meta.url may resolve differently
    path.resolve(fileURLToPath(import.meta.url), "../../../../../../README.md"),
    // Astro project root + 1 level
    path.resolve(fileURLToPath(import.meta.url), "../../../README.md"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return fs.readFileSync(candidate, "utf-8");
  }

  return null;
}

export const GET: APIRoute = () => {
  const content = findReadme();

  if (!content) {
    return new Response("README.md not found", {
      status: 404,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return new Response(content, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
