import { getCollection } from "astro:content";
import type { GetStaticPaths, APIRoute } from "astro";

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
  const { tag, posts } = props as { tag: string; posts: { id: string; data: Record<string, unknown> }[] };

  return new Response(
    JSON.stringify({
      tag,
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
