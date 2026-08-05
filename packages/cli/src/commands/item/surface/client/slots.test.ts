import { describe, expect, it } from 'vitest';

import type { Spot } from './slots.ts';

import { swapPartner } from './slots.ts';

function spot(x: number, y: number, w: number, h = 20): Spot {
  return { x, y, w, h };
}

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
});
