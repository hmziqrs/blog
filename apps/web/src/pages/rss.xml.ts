import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import { routes, siteConfig, toAbsoluteUrl } from "../config/site";

export const GET: APIRoute = async (context) => {
  if (!context.site) throw new Error("site must be set in astro.config.ts");

  const posts = await getCollection("posts", ({ data }) => !data.draft);
  const sorted = posts.toSorted((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  return rss({
    title: siteConfig.name,
    description: siteConfig.blog.homeDescription,
    site: context.site,
    xmlns: {
      atom: "http://www.w3.org/2005/Atom",
      dc: "http://purl.org/dc/elements/1.1/",
      content: "http://purl.org/rss/1.0/modules/content/",
    },
    items: sorted.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: toAbsoluteUrl(siteConfig.publicSiteUrl, `${routes.post(post.id)}/`),
      customData: `<dc:creator>${siteConfig.author.name}</dc:creator><content:encoded><![CDATA[${post.data.description ?? ""}]]></content:encoded>`,
    })),
    customData: `<language>en-us</language><atom:link href="${toAbsoluteUrl(siteConfig.publicSiteUrl, routes.rss)}" rel="self" type="application/rss+xml" />`,
  });
};
