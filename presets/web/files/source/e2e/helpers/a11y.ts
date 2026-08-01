import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

// A page nobody can operate is a page that does not work. These are the levels
// a public site is held to, and a violation is a defect rather than a note.
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] as const;

export async function expectAccessible(page: Page): Promise<void> {
  const found = await new AxeBuilder({ page }).withTags([...WCAG]).analyze();

  expect(found.violations).toStrictEqual([]);
}
