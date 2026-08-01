// Chromatic extends Playwright's test and expect rather than reading its
// output, so an archive only exists for a spec that reaches for theirs.
export { expect, test } from '@chromatic-com/playwright';
