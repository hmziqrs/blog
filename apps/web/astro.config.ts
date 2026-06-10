import sitemap, { ChangeFreqEnum } from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import icon from "astro-icon";
import { defineConfig } from "astro/config";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { siteConfig } from "../../site.config.ts";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  output: "static",
  site: siteConfig.publicSiteUrl,
  base: siteConfig.basePath,
  integrations: [
    sitemap({
      filter: (page) => {
        // Exclude utility pages that shouldn't be indexed
        const excludePaths = ["/newsletter/unsubscribe", "/advertise"];
        return !excludePaths.some((p) => page.includes(p));
      },
      serialize(item) {
        // Add changefreq and priority based on page type
        if (item.url === siteConfig.publicSiteUrl + "/") {
          item.changefreq = ChangeFreqEnum.DAILY;
          item.priority = 1.0;
        } else if (item.url.includes("/posts/")) {
          item.changefreq = ChangeFreqEnum.WEEKLY;
          item.priority = 0.8;
        } else if (item.url.includes("/tags/") || item.url.includes("/category/")) {
          item.changefreq = ChangeFreqEnum.WEEKLY;
          item.priority = 0.6;
        } else {
          item.changefreq = ChangeFreqEnum.MONTHLY;
          item.priority = 0.5;
        }
        return item;
      },
    }),
    icon({ iconDir: `${__dirname}src/icons`, include: { tabler: ["*"] } }),
  ],
  vite: {
    envDir: "../../",
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
        "@root": path.resolve(__dirname, "../../"),
      },
    },
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
