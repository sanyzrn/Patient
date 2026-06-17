import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      include: ['utils/**/*.ts'],
      exclude: ['utils/__tests__/**'],
      reporter: ['text', 'lcov'],
    },
  },
});
