import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'net',
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
});
