import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { routes, siteConfig, toAbsoluteUrl } from "../config/site";

function optionalPages() {
  const pages: Array<{ title: string; href: string; description: string }> = [];

  if (siteConfig.pages.about) {
    pages.push({
      title: siteConfig.pages.about.title,
      href: routes.about,
      description: siteConfig.pages.about.description,
    });
  }

  if (siteConfig.pages.contact) {
    pages.push({
      title: siteConfig.pages.contact.title,
      href: routes.contact,
      description: siteConfig.pages.contact.description ?? "Contact details",
    });
  }

  if (siteConfig.pages.privacy) {
    pages.push({
      title: siteConfig.pages.privacy.title,
      href: routes.privacy,
      description: siteConfig.pages.privacy.description,
    });
  }

  if (siteConfig.pages.terms) {
    pages.push({
      title: siteConfig.pages.terms.title,
      href: routes.terms,
      description: siteConfig.pages.terms.description,
    });
  }

  return pages;
}

export const GET: APIRoute = async () => {
  const posts = await getCollection("posts", ({ data }) => !data.draft);
  const newsletters = await getCollection("newsletters");

  const sortedPosts = posts.toSorted((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
  const sortedNewsletters = newsletters.toSorted(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
  );

  const lines = [
    `# ${siteConfig.name}`,
    "",
    `> ${siteConfig.blog.homeDescription}`,
    "",
    "## Posts",
    "",
    ...sortedPosts.map(
      (post) =>
        `- [${post.data.title}](${toAbsoluteUrl(siteConfig.publicSiteUrl, routes.post(post.id))}): ${post.data.description}`,
    ),
    "",
    "## Pages",
    "",
    ...optionalPages().map(
      (page) =>
        `- [${page.title}](${toAbsoluteUrl(siteConfig.publicSiteUrl, page.href)}): ${page.description}`,
    ),
    `- [Newsletter](${toAbsoluteUrl(siteConfig.publicSiteUrl, "/newsletter")}): Subscribe for updates when new posts are published.`,
    `- [Tags](${toAbsoluteUrl(siteConfig.publicSiteUrl, routes.tags)}): Browse posts by tag.`,
    `- [Categories](${toAbsoluteUrl(siteConfig.publicSiteUrl, routes.categories)}): Browse posts by category.`,
    `- [Changelog](${toAbsoluteUrl(siteConfig.publicSiteUrl, routes.changelog)}): Site version history.`,
    "",
    "## Newsletters",
    "",
    ...(sortedNewsletters.length === 0
      ? ["- None"]
      : sortedNewsletters.map((issue) => {
          const description = issue.data.description ? `: ${issue.data.description}` : "";
          return `- [${issue.data.title}](${toAbsoluteUrl(siteConfig.publicSiteUrl, `/newsletter/${issue.id}`)})${description}`;
        })),
    "",
    "## Info",
    "",
    `- Author: ${siteConfig.author.name}`,
    `- Site: ${siteConfig.publicSiteUrl}`,
    "- Built with: Astro 6, Tailwind v4, DaisyUI 5",
    "- Deployed on: Cloudflare Pages",
    "",
  ];

  return new Response(`${lines.join("\n")}`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
};
