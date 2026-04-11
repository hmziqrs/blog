import { siteConfig } from "../../config/site";
import type { GetStaticPaths, APIRoute } from "astro";
import type { AboutPageConfig, ContactPageConfig, LegalPageConfig } from "@blog/site";

type OptionalPageEntry =
  | { page: "about"; config: AboutPageConfig }
  | { page: "contact"; config: ContactPageConfig }
  | { page: "privacy"; config: LegalPageConfig }
  | { page: "terms"; config: LegalPageConfig };

export const getStaticPaths = (async () => {
  const optionalPages: OptionalPageEntry[] = [];

  if (siteConfig.pages.about) {
    optionalPages.push({ page: "about", config: siteConfig.pages.about });
  }
  if (siteConfig.pages.contact) {
    optionalPages.push({ page: "contact", config: siteConfig.pages.contact });
  }
  if (siteConfig.pages.privacy) {
    optionalPages.push({ page: "privacy", config: siteConfig.pages.privacy });
  }
  if (siteConfig.pages.terms) {
    optionalPages.push({ page: "terms", config: siteConfig.pages.terms });
  }

  return optionalPages.map(({ page, config }) => ({
    params: { page },
    props: { page, config },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { page, config } = props as OptionalPageEntry;

  return new Response(
    JSON.stringify({ page, config }),
    { headers: { "Content-Type": "application/json" } },
  );
};
