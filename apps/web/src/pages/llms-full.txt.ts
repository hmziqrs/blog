import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { siteConfig } from "../config/site";

export const GET: APIRoute = async () => {
  const posts = await getCollection("posts", ({ data }) => !data.draft);
  const sorted = posts.toSorted((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  const lines: string[] = [];
  lines.push(`# ${siteConfig.name}`);
  lines.push("");
  lines.push(`> ${siteConfig.blog.homeDescription}`);
  lines.push("");

  for (const post of sorted) {
    lines.push(`## ${post.data.title}`);
    lines.push("");
    if (post.data.description) {
      lines.push(post.data.description);
      lines.push("");
    }
    // Include the raw markdown body
    const body = post.body ?? "";
    lines.push(body);
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
