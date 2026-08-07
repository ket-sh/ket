import { existsSync, globSync } from 'node:fs';
import process from 'node:process';

import { HARNESS, readAt, reachingPast } from './bdd-binding.mts';

const GENERATED = '.features-gen';

const RESOLVED_BASE = /from ["']playwright-bdd["']/u;

// A dotted directory is invisible to a leading-dot pattern, so it is the cwd
// rather than the first segment of the glob. A cwd that does not exist throws,
// and a run that wrote nothing has to reach the count below instead.
function generatedSpecs(): string[] {
  return existsSync(GENERATED)
    ? globSync('**/*.spec.js', { cwd: GENERATED }).map((spec) => `${GENERATED}/${spec}`)
    : [];
}

function archivingNothing(specs: string[]): string[] {
  return specs
    .filter((spec) => RESOLVED_BASE.test(readAt(spec)))
    .map(
      (spec) =>
        `${spec} takes its test from playwright-bdd, so its scenario archives nothing. Pass the merged test to createSteps in ${HARNESS}`,
    );
}

const specs = generatedSpecs();

if (specs.length === 0) {
  console.error(
    'no generated spec under .features-gen, so this check read nothing. Run bddgen before it',
  );
  process.exit(1);
}

const complaints = [...reachingPast(), ...archivingNothing(specs)];

if (complaints.length > 0) {
  console.error(
    `every scenario runs through the test ${HARNESS} merges, and these do not:\n${complaints
      .map((line) => `  ${line}`)
      .join('\n')}`,
  );
  process.exit(1);
}

console.log('every scenario runs through the test the harness merges');
