import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // Относительные пути работают и на основном домене, и внутри GitHub Pages.
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@": root,
    },
  },
  build: {
    target: "es2022",
    sourcemap: false,
  },
});
