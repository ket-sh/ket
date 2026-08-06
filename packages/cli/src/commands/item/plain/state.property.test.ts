import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { plainState, stamped } from './state.ts';

describe('the invariants a stamp keeps', () => {
  it('stamps every plain sibling into freshness', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (technical, plain) => {
        expect(plainState(technical, stamped(technical, plain))).toBe('fresh');
      }),
    );
  });

  it('stamps the same way no matter how often it runs', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (technical, plain) => {
        const once = stamped(technical, plain);

        expect(stamped(technical, once)).toBe(once);
      }),
    );
  });
});
