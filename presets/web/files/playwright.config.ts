import { defineConfig } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

// A scenario is what the person approving an item approved, so the browser gate
// runs the feature files rather than a translation of them. bddgen writes the
// specs playwright then runs, and nothing edits those by hand.
const testDir = defineBddConfig({
  features: ['features/**/*.feature'],
  // bddgen resolves the custom test only from files the steps glob names, so
  // the harness sits in the list although it defines no step of its own.
  steps: ['e2e/steps/**/*.ts', 'e2e/helpers/harness.ts'],
  outputDir: '.features-gen',
});

export default defineConfig({
  testDir,
  use: { baseURL: 'http://localhost:4173' },
  webServer: {
    command: 'bun run build && bun run start',
    url: 'http://localhost:4173',
    // Reusing whatever answers this port lets an unrelated server, or a build
    // from an earlier commit, answer for this one. A port already taken has to
    // stop the gate rather than redirect it.
    reuseExistingServer: false,
  },
});
