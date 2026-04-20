import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig({
  plugins: [
    svelte({
      compilerOptions: {
        customElement: true,
      },
    }),
  ],
  build: {
    lib: {
      entry: "src/index.js",
      name: "ThreeJSBanner",
      fileName: (format) => `three-js-banner.${format}.js`,
      formats: ["es", "umd"],
    },
  },
});
