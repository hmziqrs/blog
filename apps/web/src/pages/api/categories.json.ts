import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import { z } from "zod";
import { type ApiMeta, CategorySchema } from "../../utils/api-schemas";

export const apiMeta = {
  operationId: "getCategories",
  summary: "List categories",
  description: "Returns all categories with post counts, sorted by count descending.",
  tags: ["categories"],
  response: z.object({ categories: z.array(CategorySchema) }),
} satisfies ApiMeta;

export const GET: APIRoute = async () => {
  const posts = await getCollection("posts", ({ data }) => !data.draft);

  const catMap = new Map<string, number>();
  for (const post of posts) {
    catMap.set(post.data.category, (catMap.get(post.data.category) ?? 0) + 1);
  }

  const categories = [...catMap.entries()]
    .toSorted((a, b) => b[1] - a[1])
    .map(([category, count]) => ({ category, count }));

  return new Response(JSON.stringify({ categories }), {
    headers: { "Content-Type": "application/json" },
  });
};
