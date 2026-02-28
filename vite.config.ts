import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import compression from 'vite-plugin-compression';

const buildCommitHash = process.env.VITE_BUILD_COMMIT_HASH ?? 'unknown';
const buildTimestamp = new Date().toISOString();

export default defineConfig(({ mode }) => {
  const enableCompression = mode === 'server';

  return {
    plugins: [
      react(),
      ...(enableCompression
        ? [
            // Enable if your host serves precompressed assets with Content-Encoding.
            compression(),
          ]
        : []),
    ],
    server: {
      host: true,
    },
    define: {
      'import.meta.env.VITE_BUILD_COMMIT_HASH': JSON.stringify(buildCommitHash),
      'import.meta.env.VITE_BUILD_TIMESTAMP': JSON.stringify(buildTimestamp),
    },
    test: {
      environment: 'node',
    },
    build: {
      sourcemap: false,
      minify: 'esbuild',
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
    },
  };
});
