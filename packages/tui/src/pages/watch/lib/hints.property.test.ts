import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { widthOf } from '../../../shared/lib';
import { hintIndexAt } from './hints.ts';

const GLYPHS = 'abcdefghijklmnopqrstuvwxyz0123456789?/+·←↑↓→⏎'.split('');

const glyph = fc.constantFrom(...GLYPHS);

const hint = fc
  .tuple(glyph, fc.array(fc.oneof(glyph, fc.constant(' ')), { maxLength: 8 }), glyph)
  .map(([head, middle, tail]) => head + middle.join('') + tail);

const hints = fc.array(hint, { minLength: 1, maxLength: 6 });

function separatorColumnsLandNowhere(row: string[], column: number): void {
  for (const spot of [column, column + 1, column + 2]) {
    expect(hintIndexAt(row, spot)).toBeUndefined();
  }
}

describe('the columns of the hint row', () => {
  it('resolves every hint from its own columns and no hint from a separator', () => {
    fc.assert(
      fc.property(hints, (row) => {
        let column = 0;

        for (const [at, one] of row.entries()) {
          if (at > 0) {
            separatorColumnsLandNowhere(row, column);
            column += 3;
          }

          expect(hintIndexAt(row, column)).toBe(at);
          expect(hintIndexAt(row, column + widthOf(one) - 1)).toBe(at);
          column += widthOf(one);
        }

        expect(hintIndexAt(row, column)).toBeUndefined();
      }),
    );
  });
});
