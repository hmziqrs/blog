import { getCollection } from "astro:content";
import type { GetStaticPaths, APIRoute, ImageMetadata } from "astro";
import { z } from "zod";
import { normalizeCover } from "@/src/utils/cover-image";
import { type ApiMeta, PostSummarySchema } from "../../../utils/api-schemas";

export const apiMeta = {
  operationId: "getPostsByCategory",
  summary: "Posts in a category",
  description: "Returns all published posts in the given category.",
  tags: ["categories"],
  parameters: {
    category: z.string().describe("Category name (URL-encoded)."),
  },
  response: z.object({
    category: z.string(),
    posts: z.array(PostSummarySchema),
  }),
} satisfies ApiMeta;

export const getStaticPaths = (async () => {
  const posts = await getCollection("posts", ({ data }) => !data.draft);
  const allCategories = new Set(posts.map((p) => p.data.category));
  return [...allCategories].map((category) => ({
    params: { category: encodeURIComponent(category) },
    props: {
      category,
      posts: posts.filter((p) => p.data.category === category),
    },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { category, posts } = props as {
    category: string;
    posts: {
      id: string;
      data: {
        title: string;
        description: string;
        date: Date;
        category: string;
        tags: string[];
        cover?: ImageMetadata | string;
        cover_alt?: string;
      };
    }[];
  };

  return new Response(
    JSON.stringify({
      category,
      posts: posts.map((post) => {
        const cover = normalizeCover(post.data.cover);
        return {
          id: post.id,
          title: post.data.title,
          description: post.data.description,
          date: post.data.date.toISOString(),
          category: post.data.category,
          tags: post.data.tags,
          cover: cover ? { src: cover.src, width: cover.width, height: cover.height } : null,
        };
      }),
    }),
    { headers: { "Content-Type": "application/json" } },
  );
};
