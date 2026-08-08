import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { openingOf } from './opening.ts';

const maybeWord = fc.option(fc.string(), { nil: undefined });

describe('the reading any watch ask resolves to', () => {
  it('either opens or refuses, never both and never a throw', () => {
    fc.assert(
      fc.property(maybeWord, maybeWord, maybeWord, (key, tab, screen) => {
        const reading = openingOf({ key, tab, screen });

        expect('opening' in reading).not.toBe('refused' in reading);
      }),
    );
  });

  it('opens every well-formed ask on the frame the ask names', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[A-Z]+-[0-9]+$/),
        fc.constantFrom('overview', 'workflow', 'children', 'artifacts'),
        (key, tab) => {
          expect(openingOf({ key, tab })).toStrictEqual({
            opening: { stage: { kind: 'journey', key, tab } },
          });
        },
      ),
    );
  });
});
