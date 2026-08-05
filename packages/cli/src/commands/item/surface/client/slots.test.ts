import { describe, expect, it } from 'vitest';

import type { Spot } from './slots.ts';

import { fitted, legalSpan, swapPartner } from './slots.ts';

function spot(x: number, y: number, w: number, h = 20): Spot {
  return { x, y, w, h };
}

describe('the widths a brick may take', () => {
  it('rounds nine columns and wider up to the full row', () => {
    expect(legalSpan(9)).toBe(12);
    expect(legalSpan(12)).toBe(12);
  });

  it('rounds everything narrower down to the half', () => {
    expect(legalSpan(8)).toBe(6);
    expect(legalSpan(3)).toBe(6);
  });
});

describe('the slot a spot settles into', () => {
  it('sends a spot left of the midpoint to the left slot', () => {
    expect(fitted(2, 6)).toEqual({ w: 6, x: 0 });
  });

  it('sends the midpoint itself to the right slot', () => {
    expect(fitted(3, 6)).toEqual({ w: 6, x: 6 });
  });

  it('pins a full brick to the left edge', () => {
    expect(fitted(5, 12)).toEqual({ w: 12, x: 0 });
  });
});

describe('the swap a dragged half brick asks for', () => {
  it('hands back the neighbor whose slot the drag landed on', () => {
    const layout = new Map([
      ['left', spot(0, 0, 6)],
      ['right', spot(6, 0, 6)],
    ]);

    expect(swapPartner(layout, 'right', 0)).toBe('left');
    expect(swapPartner(layout, 'left', 6)).toBe('right');
  });

  it('asks for nothing when the drag lands back on its own slot', () => {
    const layout = new Map([
      ['left', spot(0, 0, 6)],
      ['right', spot(6, 0, 6)],
    ]);

    expect(swapPartner(layout, 'right', 6)).toBeUndefined();
  });

  it('asks for nothing when a full brick is the one dragged', () => {
    const layout = new Map([
      ['wide', spot(0, 0, 12)],
      ['below', spot(0, 24, 6)],
    ]);

    expect(swapPartner(layout, 'wide', 0)).toBeUndefined();
  });

  it('leaves a half in another row band alone', () => {
    const layout = new Map([
      ['upper', spot(0, 0, 6)],
      ['lower', spot(6, 30, 6)],
    ]);

    expect(swapPartner(layout, 'upper', 6)).toBeUndefined();
  });

  it('never trades places with a full neighbor', () => {
    const layout = new Map([
      ['half', spot(6, 0, 6)],
      ['wide', spot(0, 10, 12)],
    ]);

    expect(swapPartner(layout, 'half', 0)).toBeUndefined();
  });

  it('never picks a partner for a full brick aimed at a taken slot', () => {
    const layout = new Map([
      ['wide', spot(0, 0, 12)],
      ['half', spot(6, 0, 6)],
    ]);

    expect(swapPartner(layout, 'wide', 6)).toBeUndefined();
  });

  it('asks for nothing when the dragged brick is unknown to the layout', () => {
    expect(swapPartner(new Map<string, Spot>(), 'ghost', 0)).toBeUndefined();
  });
});

describe('the row bands a swap respects', () => {
  it('leaves a band that only touches edges alone', () => {
    const layout = new Map([
      ['upper', spot(0, 0, 6, 20)],
      ['adjacent', spot(6, 20, 6, 20)],
    ]);

    expect(swapPartner(layout, 'upper', 6)).toBeUndefined();
  });

  it('leaves the touching edge alone from below as well', () => {
    const layout = new Map([
      ['lower', spot(0, 30, 6, 20)],
      ['above', spot(6, 10, 6, 20)],
    ]);

    expect(swapPartner(layout, 'lower', 6)).toBeUndefined();
  });

  it('picks the neighbor on the landed slot, not one on the origin slot', () => {
    const layout = new Map([
      ['under', spot(6, 5, 6, 20)],
      ['left', spot(0, 0, 6, 24)],
      ['dragged', spot(6, 0, 6, 10)],
    ]);

    expect(swapPartner(layout, 'dragged', 0)).toBe('left');
  });

  it('trades nothing when the drag never leaves its slot, whatever overlaps', () => {
    const layout = new Map([
      ['dragged', spot(6, 0, 6, 10)],
      ['floating', spot(6, 5, 6, 10)],
    ]);

    expect(swapPartner(layout, 'dragged', 6)).toBeUndefined();
  });
});
