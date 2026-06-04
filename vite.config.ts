import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const buildCommitHash = process.env.VITE_BUILD_COMMIT_HASH ?? 'unknown';
const buildTimestamp = new Date().toISOString();

export default defineConfig(({}) => {
  return {
    plugins: [react()],
    server: {
      host: true,
    },
    define: {
      'import.meta.env.VITE_BUILD_COMMIT_HASH': JSON.stringify(buildCommitHash),
      'import.meta.env.VITE_BUILD_TIMESTAMP': JSON.stringify(buildTimestamp),
    },
  };
});
