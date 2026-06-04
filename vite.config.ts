import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const commitSha = process.env.COMMIT_SHA ?? 'unknown';
const commitUtc = new Date().toISOString();

export default defineConfig(({}) => {
  return {
    plugins: [react()],
    server: {
      host: true,
    },
    define: {
      'import.meta.env.COMMIT_SHA': JSON.stringify(commitSha),
      'import.meta.env.COMMIT_UTC': JSON.stringify(commitUtc),
    },
  };
});
