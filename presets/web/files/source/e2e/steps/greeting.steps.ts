import { expectAccessible } from '../helpers/a11y.ts';
import { createBdd, expect } from '../helpers/harness.ts';

const { Given, Then } = createBdd();

Given('a visitor opens the home page', async ({ page }) => {
  await page.goto('/');
});

Then('the page greets the world', async ({ page }) => {
  await expect(page.getByTestId('greeting')).toHaveText('hello world');
});

Then('the page is operable by anyone', async ({ page }) => {
  await expectAccessible(page);
});
