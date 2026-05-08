import { getCollection } from "astro:content";
import type { GetStaticPaths, APIRoute, ImageMetadata } from "astro";
import { normalizeCover } from "@/src/utils/cover-image";

export const getStaticPaths = (async () => {
  const posts = await getCollection("posts", ({ data }) => !data.draft);
  return posts.map((post) => ({
    params: { slug: post.id },
    props: { post },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { post } = props as {
    post: {
      id: string;
      data: {
        title: string;
        description: string;
        date: Date;
        updated?: Date;
        category: string;
        tags: string[];
        cover?: ImageMetadata | string;
        cover_alt?: string;
      };
      body?: string;
    };
  };
  const cover = normalizeCover(post.data.cover);

  return new Response(
    JSON.stringify({
      id: post.id,
      title: post.data.title,
      description: post.data.description,
      date: post.data.date.toISOString(),
      updated: post.data.updated ? post.data.updated.toISOString() : null,
      category: post.data.category,
      tags: post.data.tags,
      cover: cover ? { src: cover.src, width: cover.width, height: cover.height } : null,
      cover_alt: post.data.cover_alt ?? null,
      body: post.body,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
};
