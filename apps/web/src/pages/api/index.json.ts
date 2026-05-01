import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import { normalizeCover } from "../../utils/cover-image";

export const GET: APIRoute = async () => {
  const posts = await getCollection("posts", ({ data }) => !data.draft);

  return new Response(
    JSON.stringify({
      posts: posts.map((post) => {
        const cover = normalizeCover(post.data.cover);
        return {
          id: post.id,
          title: post.data.title,
          description: post.data.description,
          date: post.data.date.toISOString(),
          updated: post.data.updated?.toISOString() ?? null,
          category: post.data.category,
          tags: post.data.tags,
          cover: cover ? { src: cover.src, width: cover.width, height: cover.height } : null,
          cover_alt: post.data.cover_alt ?? null,
        };
      }),
    }),
    { headers: { "Content-Type": "application/json" } },
  );
};
