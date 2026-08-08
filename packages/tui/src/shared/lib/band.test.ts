import { describe, expect, it } from 'vitest';

import { bandAt } from './band.ts';

describe('the band a banner wears', () => {
  it('paints the same color for the same spot', () => {
    expect(bandAt(0.2)).toBe(bandAt(0.2));
  });

  it('shifts the color along the band', () => {
    expect(bandAt(0.1)).not.toBe(bandAt(0.4));
  });

  it('wraps around the band in both directions', () => {
    expect(bandAt(1.25)).toBe(bandAt(0.25));
    expect(bandAt(-0.75)).toBe(bandAt(0.25));
  });
});
