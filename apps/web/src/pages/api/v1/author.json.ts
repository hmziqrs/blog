import type { APIRoute } from "astro";
import { siteConfig } from "../../../config/site";
import { toAbsoluteUrl, withBasePath } from "@blog/site";
import { extractTwitterHandle } from "../../../utils/meta";

export const GET: APIRoute = () => {
  const avatarLight = withBasePath(siteConfig.basePath, "/author-light.svg");
  const avatarDark = withBasePath(siteConfig.basePath, "/author-dark.svg");

  const socials = siteConfig.author.socials ?? [];
  const twitterHandle = extractTwitterHandle(socials);
  const emailMethod = siteConfig.pages.contact?.methods.find(
    (m) => m.label.toLowerCase() === "email",
  );
  const bio =
    siteConfig.pages.about?.description ?? siteConfig.pages.about?.paragraphs[0] ?? null;

  return new Response(
    JSON.stringify({
      author: {
        name: siteConfig.author.name,
        url: siteConfig.author.url ?? null,
        bio,
        email: emailMethod?.value ?? null,
        twitterHandle: twitterHandle ?? null,
        avatar: {
          light: toAbsoluteUrl(siteConfig.siteUrl, avatarLight),
          dark: toAbsoluteUrl(siteConfig.siteUrl, avatarDark),
        },
        socials: socials.map((social) => ({
          platform: social.platform,
          url: social.url,
        })),
        sameAs: socials.map((social) => social.url),
      },
    }),
    { headers: { "Content-Type": "application/json" } },
  );
};
