import { createBdd as createSteps } from 'playwright-bdd';

// Chromatic extends Playwright's test and expect rather than reading its
// output, so an archive only exists for a scenario that reaches for theirs.
export { expect, test } from '@chromatic-com/playwright';

export function createBdd() {
  return createSteps();
}
