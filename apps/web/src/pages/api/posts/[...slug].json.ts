import { getCollection } from "astro:content";
import type { GetStaticPaths, APIRoute } from "astro";

export const getStaticPaths = (async () => {
  const posts = await getCollection("posts", ({ data }) => !data.draft);
  return posts.map((post) => ({
    params: { slug: post.id },
    props: { post },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { post } = props as { post: { id: string; data: Record<string, unknown>; body?: string } };

  return new Response(
    JSON.stringify({
      id: post.id,
      title: post.data.title,
      description: post.data.description,
      date: (post.data.date as Date).toISOString(),
      updated: post.data.updated ? (post.data.updated as Date).toISOString() : null,
      category: post.data.category,
      tags: post.data.tags,
      cover: (post.data.cover as { src: string } | undefined)?.src ?? null,
      cover_alt: post.data.cover_alt ?? null,
      body: post.body,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
};
