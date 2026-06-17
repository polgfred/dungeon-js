import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const commitSha = process.env.COMMIT_SHA ?? 'unknown';
const commitUtc = new Date().toISOString();

// Resolve the workspace packages to their TypeScript source so Vite/Vitest
// compile them directly (no build step for internal packages).
const coreSrc = fileURLToPath(
  new URL('../../packages/core/src/index.ts', import.meta.url)
);
const netClient = fileURLToPath(
  new URL('../../packages/net/src/client/index.ts', import.meta.url)
);
const netShared = fileURLToPath(
  new URL('../../packages/net/src/shared/index.ts', import.meta.url)
);

export default defineConfig(({}) => {
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@dod/core': coreSrc,
        '@dod/net/client': netClient,
        '@dod/net/shared': netShared,
      },
    },
    server: {
      host: true,
      port: Number(process.env.PORT ?? '5173'),
      // Forward the game socket to the local wrangler dev worker
      proxy: {
        '/ws': { target: 'ws://localhost:8787', ws: true },
      },
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
