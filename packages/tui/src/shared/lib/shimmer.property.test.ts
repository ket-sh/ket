import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { shimmerAt } from './shimmer.ts';

const HEX = /^#[0-9a-f]{6}$/i;

function paintsHex(unit: number): void {
  expect(shimmerAt(unit)).toMatch(HEX);
}

describe('the color a shimmer always answers with', () => {
  it('paints a hex color for any spot on the band', () => {
    fc.assert(fc.property(fc.double({ noNaN: true, min: -100, max: 100 }), paintsHex));
  });
});
