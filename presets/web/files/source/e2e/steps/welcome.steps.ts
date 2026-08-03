import { expectAccessible } from '../helpers/a11y.ts';
import { createBdd, expect } from '../helpers/harness.ts';

const { Given, Then } = createBdd();

Given('a visitor opens the home page', async ({ page }) => {
  await page.goto('/');
});

Then('the page welcomes them to {string}', async ({ page }, project: string) => {
  await expect(page.getByTestId('welcome')).toHaveText(`Welcome to ${project}.`);
});

Then('the page is operable by anyone', async ({ page }) => {
  await expectAccessible(page);
});
