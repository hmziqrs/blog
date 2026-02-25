// @ts-check
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
  output: "static",
  site: "https://hmziq.rs",
  vite: {
    plugins: [tailwindcss()],
  },
});
