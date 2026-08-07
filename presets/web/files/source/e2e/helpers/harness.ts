import { createBdd as createSteps, test } from 'playwright-bdd';

// Every spec and every step reaches for its test and expect here, so a tool
// that extends them is enabled by replacing this one file rather than each one.
export { expect } from '@playwright/test';

export { test };

export function createBdd() {
  return createSteps(test);
}
