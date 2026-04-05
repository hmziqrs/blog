import { describe, expect, test } from "bun:test";
import { createRoutes, defineSiteConfig, toAbsoluteUrl } from "@blog/site";

describe("route helpers", () => {
  test("builds root routes without duplicating slashes", () => {
    const routes = createRoutes("/");

    expect(routes.home).toBe("/");
    expect(routes.rss).toBe("/rss.xml");
    expect(routes.post("hello-world")).toBe("/posts/hello-world");
  });

  test("builds non-root routes with base path applied", () => {
    const routes = createRoutes("/blog");

    expect(routes.home).toBe("/blog");
    expect(routes.tags).toBe("/blog/tags");
    expect(routes.rss).toBe("/blog/rss.xml");
    expect(routes.post("hello-world")).toBe("/blog/posts/hello-world");
  });

  test("encodes tag and category segments", () => {
    const routes = createRoutes("/blog");

    expect(routes.tag("astro tips")).toBe("/blog/tags/astro%20tips");
    expect(routes.category("c#/.net")).toBe("/blog/category/c%23%2F.net");
  });

  test("builds absolute URLs against the configured site URL", () => {
    expect(toAbsoluteUrl("https://example.com", "/blog/rss.xml")).toBe(
      "https://example.com/blog/rss.xml",
    );
  });

  test("derives the public site URL from the base path", () => {
    const config = defineSiteConfig({
      name: "Example",
      siteUrl: "https://example.com",
      basePath: "/blog",
      author: {
        name: "Example Author",
      },
      footerDescription: "Example blog",
      blog: {
        homeTitle: "Example",
        homeDescription: "Example description",
      },
      primaryNav: [],
      footerNav: [],
      pages: {},
    });

    expect(config.publicSiteUrl).toBe("https://example.com/blog");
  });
});

describe("site config nav resolution", () => {
  test("hides disabled optional pages from resolved navigation", () => {
    const config = defineSiteConfig({
      name: "Example",
      siteUrl: "https://example.com",
      author: {
        name: "Example Author",
      },
      footerDescription: "Example blog",
      blog: {
        homeTitle: "Example",
        homeDescription: "Example description",
      },
      primaryNav: [
        { page: "about", label: "About" },
        { page: "contact", label: "Contact" },
      ],
      footerNav: [
        { page: "tags", label: "Tags" },
        { page: "privacy", label: "Privacy" },
      ],
      pages: {
        about: {
          title: "About",
          description: "About page",
          paragraphs: ["One paragraph."],
          focusAreas: [{ title: "Focus", body: "Area." }],
          principles: ["One principle."],
        },
      },
    });

    expect(config.primaryNav).toEqual([{ label: "About", href: config.routes.about }]);
    expect(config.footerNav).toEqual([{ label: "Tags", href: config.routes.tags }]);
  });
});
