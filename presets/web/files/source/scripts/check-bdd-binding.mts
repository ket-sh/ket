import process from 'node:process';

import { HARNESS, readAt, reachingPast } from './bdd-binding.mts';

const BINDS = /create(?:Steps|Bdd)\(test\)/u;

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
