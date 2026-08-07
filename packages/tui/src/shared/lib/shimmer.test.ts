import { describe, expect, it } from 'vitest';

import { shimmerAt } from './shimmer.ts';

describe('the shimmer a banner wears', () => {
  it('paints the same color for the same spot', () => {
    expect(shimmerAt(0.2)).toBe(shimmerAt(0.2));
  });

  it('shifts the color along the band', () => {
    expect(shimmerAt(0.1)).not.toBe(shimmerAt(0.4));
  });

  it('wraps around the band in both directions', () => {
    expect(shimmerAt(1.25)).toBe(shimmerAt(0.25));
    expect(shimmerAt(-0.75)).toBe(shimmerAt(0.25));
  });
});
