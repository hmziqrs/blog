import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";
import { routes, siteConfig } from "../config/site";

export async function GET(context: APIContext) {
  if (!context.site) throw new Error("site must be set in astro.config.ts");

  const posts = await getCollection("posts", ({ data }) => !data.draft);
  const sorted = posts.toSorted((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  return rss({
    title: siteConfig.name,
    description: siteConfig.blog.homeDescription,
    site: context.site,
    xmlns: { atom: "http://www.w3.org/2005/Atom" },
    items: sorted.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: `${routes.post(post.id)}/`,
    })),
    customData: `<language>en-us</language><atom:link href="${context.site}rss.xml" rel="self" type="application/rss+xml" />`,
  });
}
