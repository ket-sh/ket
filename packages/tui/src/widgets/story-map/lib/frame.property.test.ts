import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { columnWidthsOf } from './frame.ts';

const ANY_PANE = fc.integer({ min: 0, max: 400 });

const ANY_COUNT = fc.integer({ min: 1, max: 24 });

function dealtOf(widths: number[]): number {
  let sum = 0;

  for (const width of widths) {
    sum += width;
  }

  return sum;
}

describe('what the column split promises whatever pane it is handed', () => {
  it('hands out exactly the band interior, wall to wall', () => {
    fc.assert(
      fc.property(ANY_PANE, ANY_COUNT, (cols, count) => {
        expect(dealtOf(columnWidthsOf(cols, count))).toBe(Math.max(0, cols - 4));
      }),
    );
  });

  it('never deals a negative width and never favors a right column', () => {
    fc.assert(
      fc.property(ANY_PANE, ANY_COUNT, (cols, count) => {
        const widths = columnWidthsOf(cols, count);

        expect(widths).toHaveLength(count);

        for (const [at, width] of widths.entries()) {
          expect(width).toBeGreaterThanOrEqual(0);
          expect(width).toBeLessThanOrEqual(widths[at - 1] ?? width);
        }
      }),
    );
  });
});
