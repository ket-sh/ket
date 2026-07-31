import { expect, test } from '@playwright/test';

test('the home page greets whoever it was told to', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('greeting')).toHaveText('hello world');
});
