import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { greeting } from './greeting.ts';

describe('greeting, over arbitrary names', () => {
  it('always opens with the same word, whoever is named', () => {
    fc.assert(
      fc.property(fc.string(), (who) => {
        expect(greeting(who).startsWith('hello ')).toBe(true);
      }),
    );
  });

  it('names whoever is given, whatever they are called', () => {
    fc.assert(
      fc.property(
        fc.string().filter((who) => who !== ''),
        (who) => {
          expect(greeting(who)).toBe(`hello ${who}`);
        },
      ),
    );
  });
});
