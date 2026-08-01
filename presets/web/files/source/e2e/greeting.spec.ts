import { expectAccessible } from './helpers/a11y.ts';
import { expect, test } from './helpers/harness.ts';

test('the home page greets whoever it was told to', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('greeting')).toHaveText('hello world');
  await expectAccessible(page);
});
