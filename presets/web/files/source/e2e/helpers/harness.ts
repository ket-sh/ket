import { createBdd as createSteps } from 'playwright-bdd';

// Every spec and every step reaches for its test and expect here, so a tool
// that extends them is enabled by replacing this one file rather than each one.
export { expect, test } from '@playwright/test';

export function createBdd() {
  return createSteps();
}
