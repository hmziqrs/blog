import type { ExpoConfig } from "expo/config";
import { siteConfig } from "@blog/site";

const config: ExpoConfig = {
  name: siteConfig.name,
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
    siteUrl: siteConfig.siteUrl,
    contactPath: siteConfig.contactPath,
  },
};

export default config;
