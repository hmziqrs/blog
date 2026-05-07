import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { newslettersPlugin } from "./plugins/newsletters";

export default defineConfig({
  plugins: [react(), tailwindcss(), newslettersPlugin()],
  server: {
    port: 4322,
    open: true,
  },
  build: {
    outDir: "dist",
  },
});
