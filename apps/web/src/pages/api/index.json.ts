import { getCollection } from "astro:content";
import type { APIRoute } from "astro";

export const GET: APIRoute = async () => {
  const posts = await getCollection("posts", ({ data }) => !data.draft);

  return new Response(
    JSON.stringify({
      posts: posts.map((post) => ({
        id: post.id,
        title: post.data.title,
        description: post.data.description,
        date: post.data.date.toISOString(),
        updated: post.data.updated?.toISOString() ?? null,
        category: post.data.category,
        tags: post.data.tags,
        cover: post.data.cover?.src ?? null,
        cover_alt: post.data.cover_alt ?? null,
      })),
    }),
    { headers: { "Content-Type": "application/json" } },
  );
};
