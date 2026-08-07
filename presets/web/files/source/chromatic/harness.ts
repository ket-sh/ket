import { expect, test as archived } from '@chromatic-com/playwright';
import { mergeTests } from '@playwright/test';
import { createBdd as createSteps, test as scripted } from 'playwright-bdd';

// Chromatic extends Playwright's test rather than reading its output, and the
// bdd keywords live on playwright-bdd's test as fixtures. Only their merge
// carries both, and bddgen writes specs that import this very test, so an
// archive exists only for a scenario that runs through it.
export const test = mergeTests(archived, scripted);

export { expect };

export function createBdd() {
  return createSteps(test);
}
