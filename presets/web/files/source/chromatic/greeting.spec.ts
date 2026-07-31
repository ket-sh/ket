// Chromatic extends Playwright's test and expect rather than reading its
// output, so the archive it uploads only exists when the spec imports theirs.
import { expect, test } from '@chromatic-com/playwright';

test('the home page greets whoever it was told to', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('greeting')).toHaveText('hello world');
});
