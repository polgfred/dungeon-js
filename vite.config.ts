import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import compression from "vite-plugin-compression";

export default defineConfig({
  base: "/dungeon-js/",
  plugins: [
    react(),
    // Enable if your host serves precompressed assets with Content-Encoding.
    // compression(),
    // compression({ algorithm: "brotliCompress", ext: ".br" }),
  ],
  server: {
    host: true,
  },
  build: {
    sourcemap: false,
    minify: "esbuild",
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
