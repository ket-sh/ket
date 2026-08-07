import { globSync, readFileSync } from 'node:fs';
import process from 'node:process';

const HARNESS = 'e2e/helpers/harness.ts';

// A type-only import binds nothing at runtime, so it may name the package.
const REACHES_PAST = /^import (?!type ).*from 'playwright-bdd'/mu;

const BINDS = /create(?:Steps|Bdd)\(test\)/u;

function readAt(path: string): string {
  return readFileSync(path, 'utf8');
}

function reachingPast(): string[] {
  return globSync('e2e/**/*.ts')
    .filter((file) => file !== HARNESS)
    .filter((file) => REACHES_PAST.test(readAt(file)))
    .map((file) => `${file} imports playwright-bdd instead of ${HARNESS}`);
}

function unbound(): string[] {
  return BINDS.test(readAt(HARNESS))
    ? []
    : [`${HARNESS} never binds its steps to the test it exports`];
}

function unresolved(): string[] {
  return readAt('playwright.config.ts').includes(HARNESS)
    ? []
    : [`playwright.config.ts names no ${HARNESS} in steps, so bddgen resolves the base test`];
}

const complaints = [...reachingPast(), ...unbound(), ...unresolved()];

if (complaints.length > 0) {
  console.error(
    `every spec binds to the harness test, and these do not:\n${complaints
      .map((line) => `  ${line}`)
      .join('\n')}`,
  );
  process.exit(1);
}

console.log('every spec binds to the harness test');
