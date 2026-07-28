import { describe, expect, it } from 'vitest';

import { appearanceOf, BLINK_FRAMES } from './appearance.ts';

describe('showing a stage by its status', () => {
  it('marks a finished stage green and settled', () => {
    const first = appearanceOf('done', 0);

    expect(first.color).toBe('#57ab5a');
    expect(first.color).toBe(appearanceOf('done', 99).color);
  });

  it('mutes a stage that has not started', () => {
    expect(appearanceOf('pending', 0).color).toBe('#5f5f5f');
  });

  it('blinks the running stage between two oranges', () => {
    const lit = appearanceOf('active', 0).color;
    const dim = appearanceOf('active', BLINK_FRAMES).color;

    expect(lit).not.toBe(dim);
    expect(appearanceOf('active', BLINK_FRAMES * 2).color).toBe(lit);
  });

  it('leaves the running mark to the spinner component', () => {
    expect(appearanceOf('active', 0).mark).toBe('');
  });

  it('holds every settled mark still', () => {
    expect(appearanceOf('done', 0).mark).toBe(appearanceOf('done', 7).mark);
    expect(appearanceOf('blocked', 0).mark).toBe(appearanceOf('blocked', 7).mark);
  });
});
