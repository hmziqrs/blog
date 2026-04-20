import type { APIRoute } from "astro";
import { siteConfig } from "../config/site";
import { toAbsoluteUrl } from "@blog/site";

export const GET: APIRoute = () =>
  new Response(
    `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${toAbsoluteUrl(siteConfig.siteUrl, siteConfig.routes.sitemapIndex)}\n`,
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    },
  );
