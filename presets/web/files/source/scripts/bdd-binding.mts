import { globSync, readFileSync } from 'node:fs';

export const HARNESS = 'e2e/helpers/harness.ts';

// A type-only import binds nothing at runtime, so it may name the package.
const REACHES_PAST = /^import (?!type ).*from 'playwright-bdd'/mu;

export function readAt(path: string): string {
  return readFileSync(path, 'utf8');
}

export function reachingPast(): string[] {
  return globSync('e2e/**/*.ts')
    .filter((file) => file !== HARNESS)
    .filter((file) => REACHES_PAST.test(readAt(file)))
    .map((file) => `${file} imports playwright-bdd instead of ${HARNESS}`);
}
