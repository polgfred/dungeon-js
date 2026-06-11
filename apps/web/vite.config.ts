import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const commitSha = process.env.COMMIT_SHA ?? 'unknown';
const commitUtc = new Date().toISOString();

// Resolve the workspace engine to its TypeScript source so Vite/Vitest compile
// it directly (no build step for internal packages).
const coreSrc = fileURLToPath(
  new URL('../../packages/core/src/index.ts', import.meta.url)
);

export default defineConfig(({}) => {
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@dod/core': coreSrc,
      },
    },
    server: {
      host: true,
    },
    define: {
      'import.meta.env.COMMIT_SHA': JSON.stringify(commitSha),
      'import.meta.env.COMMIT_UTC': JSON.stringify(commitUtc),
    },
    test: {
      name: 'web',
      environment: 'jsdom',
      include: ['test/**/*.test.{ts,tsx}'],
    },
  };
});
