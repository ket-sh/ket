import { defineConfig } from 'vitest/config';

// The mutation gate measures the domain. An integration test composes adapters
// and stubs a boundary, so it answers a different question and is left out.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['src/**/*.integration.test.ts'],
  },
});
