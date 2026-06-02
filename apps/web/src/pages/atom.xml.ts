import { getCollection } from "astro:content";
import type { APIContext } from "astro";
import { routes, siteConfig, toAbsoluteUrl } from "../config/site";

export async function GET(context: APIContext) {
  if (!context.site) throw new Error("site must be set in astro.config.ts");

  const posts = await getCollection("posts", ({ data }) => !data.draft);
  const sorted = posts.toSorted((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  const atomUrl = toAbsoluteUrl(siteConfig.publicSiteUrl, routes.atom);
  const siteUrl = context.site.toString();

  const entries = sorted
    .map((post) => {
      const postUrl = toAbsoluteUrl(siteUrl, `${routes.post(post.id)}/`);
      const updated = post.data.date.toISOString();
      const id = `tag:${new URL(siteUrl).hostname},${post.data.date.toISOString().slice(0, 10)}:${post.id}`;
      return `    <entry>
      <title>${escapeXml(post.data.title)}</title>
      <link href="${postUrl}" rel="alternate" type="text/html" />
      <id>${id}</id>
      <updated>${updated}</updated>
      <summary>${escapeXml(post.data.description)}</summary>
    </entry>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${escapeXml(siteConfig.name)}</title>
  <subtitle>${escapeXml(siteConfig.blog.homeDescription)}</subtitle>
  <link href="${atomUrl}" rel="self" type="application/atom+xml" />
  <link href="${siteUrl}" rel="alternate" type="text/html" />
  <id>${atomUrl}</id>
  <updated>${sorted.length > 0 ? sorted[0]!.data.date.toISOString() : new Date().toISOString()}</updated>
  <generator uri="https://astro.build/">Astro</generator>
${entries}
</feed>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/atom+xml; charset=utf-8" },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
