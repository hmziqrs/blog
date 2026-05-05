import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import icon from "astro-icon";
import { defineConfig } from "astro/config";
import { fileURLToPath } from "node:url";
import { siteConfig } from "../../site.config.ts";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  output: "static",
  site: siteConfig.publicSiteUrl,
  base: siteConfig.basePath,
  integrations: [sitemap(), icon({ iconDir: `${__dirname}src/icons`, include: { tabler: ["*"] } })],
  vite: {
    envDir: "../../",
    plugins: [tailwindcss()],
    ssr: {
      noExternal: ["@iconify-json/tabler"],
    },
    server: {
      proxy: {
        "/api/newsletter": "http://localhost:8788",
      },
    },
  },
});
