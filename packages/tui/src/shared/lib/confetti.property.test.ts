import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { confettiRows } from './confetti.ts';

function fitsItsRoom(tick: number, width: number, rows: number): void {
  const drawn = confettiRows(tick, width, rows);

  expect(drawn).toHaveLength(rows);

  for (const spans of drawn) {
    expect(spans.map((span) => span.text).join('')).toHaveLength(width);
  }
}

describe('the room confetti always respects', () => {
  it('fills its room exactly, whatever the tick', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 1, max: 80 }),
        fc.integer({ min: 1, max: 8 }),
        fitsItsRoom,
      ),
    );
  });
});
