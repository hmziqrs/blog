export interface SiteNavItem {
  href: string;
  label: string;
}

export interface SiteNavItemInput {
  label: string;
  href?: string;
  page?: "about" | "contact" | "privacy" | "terms" | "tags" | "categories";
}

export interface ContentSection {
  title: string;
  body: string;
}

export interface ContactMethod {
  label: string;
  value: string;
  href: string;
}

export interface SiteAuthor {
  name: string;
  url?: string;
}

export interface AboutPageConfig {
  title: string;
  description: string;
  paragraphs: string[];
  focusAreas: ContentSection[];
  principles: string[];
}

export interface ContactPageConfig {
  title: string;
  description?: string;
  paragraphs: string[];
  methods: ContactMethod[];
}

export interface LegalPageConfig {
  title: string;
  description: string;
  badgeLabel: string;
  effectiveDate: string;
  preamble: string[];
  sections: ContentSection[];
}

export interface BlogConfig {
  homeTitle: string;
  homeDescription: string;
}

export interface SitePagesConfig {
  about?: AboutPageConfig;
  contact?: ContactPageConfig;
  privacy?: LegalPageConfig;
  terms?: LegalPageConfig;
}

export interface RoutesConfig {
  home: string;
  about: string;
  contact: string;
  privacy: string;
  terms: string;
  tags: string;
  categories: string;
  rss: string;
  robots: string;
  favicon: string;
  ogDefault: string;
  sitemapIndex: string;
  post: (slug: string) => string;
  tag: (tag: string) => string;
  category: (category: string) => string;
}

export interface SiteConfigInput {
  name: string;
  siteUrl: string;
  basePath?: string;
  author: SiteAuthor;
  footerDescription?: string;
  blog: BlogConfig;
  primaryNav: SiteNavItemInput[];
  footerNav: SiteNavItemInput[];
  pages: SitePagesConfig;
}

export interface SiteConfig extends Omit<SiteConfigInput, "primaryNav" | "footerNav"> {
  basePath: string;
  publicSiteUrl: string;
  primaryNav: SiteNavItem[];
  footerNav: SiteNavItem[];
  routes: RoutesConfig;
}

export function normalizeBasePath(basePath = "/") {
  if (!basePath || basePath === "/") return "/";
  const withLeadingSlash = basePath.startsWith("/") ? basePath : `/${basePath}`;
  return withLeadingSlash.endsWith("/")
    ? withLeadingSlash.slice(0, Math.max(1, withLeadingSlash.length - 1))
    : withLeadingSlash;
}

export function withBasePath(basePath: string, path: string) {
  if (!path.startsWith("/")) return path;
  const normalizedBasePath = normalizeBasePath(basePath);
  if (path === "/") return normalizedBasePath;
  return normalizedBasePath === "/" ? path : `${normalizedBasePath}${path}`;
}

export function toAbsoluteUrl(siteUrl: string, path: string) {
  const normalizedSiteUrl = siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`;
  return new URL(path, normalizedSiteUrl).toString();
}

export function encodeRouteSegment(value: string) {
  return encodeURIComponent(value);
}

export function createRoutes(basePath = "/"): RoutesConfig {
  return {
    home: withBasePath(basePath, "/"),
    about: withBasePath(basePath, "/about"),
    contact: withBasePath(basePath, "/contact"),
    privacy: withBasePath(basePath, "/privacy"),
    terms: withBasePath(basePath, "/terms"),
    tags: withBasePath(basePath, "/tags"),
    categories: withBasePath(basePath, "/categories"),
    rss: withBasePath(basePath, "/rss.xml"),
    robots: withBasePath(basePath, "/robots.txt"),
    favicon: withBasePath(basePath, "/favicon.svg"),
    ogDefault: withBasePath(basePath, "/og-default.svg"),
    sitemapIndex: withBasePath(basePath, "/sitemap-index.xml"),
    post: (slug) => withBasePath(basePath, `/posts/${slug}`),
    tag: (tag) => withBasePath(basePath, `/tags/${encodeRouteSegment(tag)}`),
    category: (category) => withBasePath(basePath, `/category/${encodeRouteSegment(category)}`),
  };
}

function isOptionalPageEnabled(
  pages: SitePagesConfig,
  page: "about" | "contact" | "privacy" | "terms",
) {
  return Boolean(pages[page]);
}

function resolveNavItem(
  item: SiteNavItemInput,
  routes: RoutesConfig,
  pages: SitePagesConfig,
  basePath: string,
): SiteNavItem | null {
  if (item.page) {
    if (
      (item.page === "about" ||
        item.page === "contact" ||
        item.page === "privacy" ||
        item.page === "terms") &&
      !isOptionalPageEnabled(pages, item.page)
    ) {
      return null;
    }

    return {
      label: item.label,
      href: routes[item.page],
    };
  }

  if (!item.href) return null;

  return {
    label: item.label,
    href:
      item.href.startsWith("http://") || item.href.startsWith("https://")
        ? item.href
        : withBasePath(basePath, item.href),
  };
}

function resolveNav(
  items: SiteNavItemInput[],
  routes: RoutesConfig,
  pages: SitePagesConfig,
  basePath: string,
) {
  return items
    .map((item) => resolveNavItem(item, routes, pages, basePath))
    .filter((item): item is SiteNavItem => item !== null);
}

export function defineSiteConfig(input: SiteConfigInput): SiteConfig {
  const basePath = normalizeBasePath(input.basePath);
  const routes = createRoutes(basePath);

  return {
    ...input,
    basePath,
    publicSiteUrl: toAbsoluteUrl(input.siteUrl, routes.home),
    primaryNav: resolveNav(input.primaryNav, routes, input.pages, basePath),
    footerNav: resolveNav(input.footerNav, routes, input.pages, basePath),
    routes,
  };
}

export function formatPageTitle(siteName: string, value?: string) {
  return value ? `${value} — ${siteName}` : siteName;
}
