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
  const { post } = props as {
    post: {
      id: string;
      body?: string;
    };
  };

  return new Response(post.body ?? "", {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
