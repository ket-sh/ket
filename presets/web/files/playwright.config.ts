import { defineConfig } from '@playwright/test';

// Playwright and vitest default to the same globs, so each would try to run the
// other's tests. Naming both directories is what keeps them apart.
export default defineConfig({
  testDir: './e2e',
  use: { baseURL: 'http://localhost:4173' },
  webServer: {
    command: 'bun run build && bun run start',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
  },
});
