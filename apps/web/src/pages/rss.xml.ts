import { getCollection } from "astro:content";
import type { APIContext } from "astro";

export async function GET(context: APIContext) {
  const posts = await getCollection("posts", ({ data }) => !data.draft);
  const sorted = posts.toSorted((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  const site = context.site!.toString();

  const items = sorted
    .map(
      (post) => `
    <item>
      <title><![CDATA[${post.data.title}]]></title>
      <description><![CDATA[${post.data.description}]]></description>
      <link>${site}posts/${post.id}/</link>
      <guid>${site}posts/${post.id}/</guid>
      <pubDate>${post.data.date.toUTCString()}</pubDate>
    </item>`,
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>hmziq.rs</title>
    <description>A blog about software engineering.</description>
    <link>${site}</link>
    <atom:link href="${site}rss.xml" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
