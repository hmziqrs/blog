import { getCollection } from "astro:content";
import type { GetStaticPaths, APIRoute } from "astro";

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
    posts: { id: string; data: Record<string, unknown> }[];
  };

  return new Response(
    JSON.stringify({
      category,
      posts: posts.map((post) => ({
        id: post.id,
        title: post.data.title,
        description: post.data.description,
        date: (post.data.date as Date).toISOString(),
        category: post.data.category,
        tags: post.data.tags,
        cover: (post.data.cover as { src: string } | undefined)?.src ?? null,
      })),
    }),
    { headers: { "Content-Type": "application/json" } },
  );
};
