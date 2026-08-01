import { defineConfig } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

// A scenario is what the person approving an item approved, so the browser gate
// runs the feature files rather than a translation of them. bddgen writes the
// specs playwright then runs, and nothing edits those by hand.
const testDir = defineBddConfig({
  features: ['features/**/*.feature'],
  steps: ['e2e/steps/**/*.ts'],
  outputDir: '.features-gen',
});

export default defineConfig({
  testDir,
  use: { baseURL: 'http://localhost:4173' },
  webServer: {
    command: 'bun run build && bun run start',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
  },
});
