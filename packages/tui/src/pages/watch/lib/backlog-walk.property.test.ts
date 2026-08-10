import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import type { ShelfStep } from './backlog-walk.ts';

import { shelfStepped } from './backlog-walk.ts';

const someStanding = fc.record({
  at: fc.option(fc.integer({ min: 0, max: 8 }), { nil: undefined }),
  rows: fc.integer({ min: 0, max: 8 }),
  filedLeft: fc.integer({ min: 0, max: 5 }),
});

const someDelta = fc.integer({ min: -3, max: 3 });

function seatedOnAShelfRow(step: ShelfStep, rows: number): boolean {
  return step.at === undefined || (step.at >= 0 && step.at < rows);
}

function restsWithTheFiledRows(step: ShelfStep): boolean {
  return step.took || step.at === undefined;
}

describe('the invariants every backlog step keeps', () => {
  it('never seats the cursor outside the shelf it walks', () => {
    fc.assert(
      fc.property(someStanding, someDelta, (standing, delta) => {
        expect(seatedOnAShelfRow(shelfStepped(standing, delta), standing.rows)).toBe(true);
      }),
    );
  });

  it('leaves the cursor with the filed rows whenever the shelf declines the step', () => {
    fc.assert(
      fc.property(someStanding, someDelta, (standing, delta) => {
        expect(restsWithTheFiledRows(shelfStepped(standing, delta))).toBe(true);
      }),
    );
  });
});
