import { getCollection } from "astro:content";
import type { APIRoute } from "astro";

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
