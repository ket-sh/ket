import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { stampOf } from './docs-stamp.ts';

const somePath = fc.stringMatching(/^[a-z]{1,8}(?:\/[a-z]{1,8}){0,3}\.[a-z]{1,3}$/u);

const someEntries = fc.uniqueArray(
  fc.record({ path: somePath, content: fc.string({ maxLength: 40 }) }),
  { selector: (entry) => entry.path, maxLength: 8 },
);

const someShuffledPair = someEntries.chain((entries) =>
  fc.tuple(
    fc.constant(entries),
    fc.shuffledSubarray(entries, { minLength: entries.length, maxLength: entries.length }),
  ),
);

describe('the stamp fingerprint invariant', () => {
  it('given the same sources in any order, then the stamp never moves', () => {
    fc.assert(
      fc.property(someShuffledPair, ([entries, shuffled]) => {
        expect(stampOf(shuffled)).toBe(stampOf(entries));
      }),
    );
  });
});
