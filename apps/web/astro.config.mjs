// @ts-check
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import icon from "astro-icon";
import { defineConfig } from "astro/config";
import { siteConfig } from "@blog/site";

export default defineConfig({
  output: "static",
  site: siteConfig.siteUrl,
  integrations: [sitemap(), icon()],
  vite: {
    plugins: [tailwindcss()],
  },
});
