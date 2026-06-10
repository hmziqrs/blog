import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import { z } from "zod";
import { type ApiMeta, TagSchema } from "../../../utils/api-schemas";

export const apiMeta = {
  operationId: "getTags",
  summary: "List tags",
  description: "Returns all tags with post counts, sorted alphabetically.",
  tags: ["tags"],
  response: z.object({ tags: z.array(TagSchema) }),
} satisfies ApiMeta;

export const GET: APIRoute = async () => {
  const posts = await getCollection("posts", ({ data }) => !data.draft);

  const tagMap = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.data.tags) {
      tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1);
    }
  }

  const tags = [...tagMap.entries()]
    .toSorted((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ tag, count }));

  return new Response(JSON.stringify({ tags }), {
    headers: { "Content-Type": "application/json" },
  });
};
