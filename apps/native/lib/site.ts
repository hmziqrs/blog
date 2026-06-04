import { siteConfig } from "@root/site.config.ts";

export const SITE = {
  name: siteConfig.name,
  homeTitle: siteConfig.blog.homeTitle,
  description: siteConfig.blog.homeDescription,
  url: siteConfig.publicSiteUrl,
  siteUrl: siteConfig.siteUrl,
  author: siteConfig.author,
  copyrightSiteName: siteConfig.copyrightSiteName,
  copyrightSiteURL: siteConfig.copyrightSiteURL,
  footerNav: siteConfig.footerNav,
  primaryNav: siteConfig.primaryNav,
  routes: siteConfig.routes,
} as const;

export function postUrl(slug: string) {
  return `${SITE.url.replace(/\/$/, "")}/posts/${slug}`;
}

export function absoluteUrl(path: string) {
  if (path.startsWith("http")) return path;
  const base = SITE.url.endsWith("/") ? SITE.url : `${SITE.url}/`;
  return new URL(path.replace(/^\//, ""), base).toString();
}
