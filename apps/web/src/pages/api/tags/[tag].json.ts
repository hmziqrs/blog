import { getCollection } from "astro:content";
import type { GetStaticPaths, APIRoute, ImageMetadata } from "astro";
import { z } from "zod";
import { normalizeCover } from "@/src/utils/cover-image";
import { type ApiMeta, PostSummarySchema } from "../../../utils/api-schemas";

export const apiMeta = {
  operationId: "getPostsByTag",
  summary: "Posts by tag",
  description: "Returns all published posts with the given tag.",
  tags: ["tags"],
  parameters: {
    tag: z.string().describe("Tag name (URL-encoded)."),
  },
  response: z.object({
    tag: z.string(),
    posts: z.array(PostSummarySchema),
  }),
} satisfies ApiMeta;

export const getStaticPaths = (async () => {
  const posts = await getCollection("posts", ({ data }) => !data.draft);
  const allTags = new Set(posts.flatMap((p) => p.data.tags));
  return [...allTags].map((tag) => ({
    params: { tag: encodeURIComponent(tag) },
    props: {
      tag,
      posts: posts.filter((p) => p.data.tags.includes(tag)),
    },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { tag, posts } = props as {
    tag: string;
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
      tag,
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
