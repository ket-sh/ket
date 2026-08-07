import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { ageOf } from './age.ts';

const NOW = 1_786_363_200_000;

const someElapsed = fc.integer({ min: 0, max: 400 * 24 * 60 * 60 * 1000 });

describe('the invariants an age keeps', () => {
  it('always fits the column: one number, one unit, four characters at most', () => {
    fc.assert(
      fc.property(someElapsed, (elapsed) => {
        const spoken = ageOf(new Date(NOW - elapsed).toISOString(), new Date(NOW).toISOString());

        expect(spoken).toMatch(/^\d+(?:s|m|h|d)$/);
        expect(spoken.length).toBeLessThanOrEqual(4);
      }),
    );
  });
});
