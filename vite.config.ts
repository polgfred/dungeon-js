import { execSync } from "node:child_process";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import compression from "vite-plugin-compression";

function readGitCommitHash() {
  try {
    return execSync("git rev-parse --short HEAD", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    return "unknown";
  }
}

const buildCommitHash = readGitCommitHash();
const buildTimestamp = new Date().toISOString();

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
  define: {
    "import.meta.env.VITE_BUILD_COMMIT_HASH": JSON.stringify(buildCommitHash),
    "import.meta.env.VITE_BUILD_TIMESTAMP": JSON.stringify(buildTimestamp),
  },
  test: {
    environment: "node",
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
