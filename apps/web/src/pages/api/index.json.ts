import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import { z } from "zod";
import { normalizeCover } from "../../utils/cover-image";
import { type ApiMeta, PostSummarySchema } from "../../utils/api-schemas";

export const apiMeta = {
  operationId: "getAllPosts",
  summary: "List all posts",
  description: "Returns all published posts sorted by date (newest first).",
  tags: ["posts"],
  response: z.object({ posts: z.array(PostSummarySchema) }),
} satisfies ApiMeta;

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
