import type { ExpoConfig } from "expo/config";
import { routes, siteConfig } from "../../site.config.ts";

const config: ExpoConfig = {
  name: siteConfig.name,
  description: siteConfig.blog.homeDescription,
  slug: "blog",
  scheme: "blog",
  userInterfaceStyle: "automatic",
  orientation: "default",
  web: {
    bundler: "metro",
  },
  plugins: ["expo-font"],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    siteName: siteConfig.name,
    siteUrl: siteConfig.publicSiteUrl,
    contactPath: routes.contact,
  },
};

export default config;
