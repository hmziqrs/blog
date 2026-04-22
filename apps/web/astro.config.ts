import cloudflare from "@astrojs/cloudflare";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import icon from "astro-icon";
import { defineConfig } from "astro/config";
import { siteConfig } from "../../site.config.ts";

export default defineConfig({
  output: "server",
  adapter: cloudflare(),
  site: siteConfig.publicSiteUrl,
  base: siteConfig.basePath,
  integrations: [sitemap(), icon()],
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      noExternal: true,
    },
  },
});
