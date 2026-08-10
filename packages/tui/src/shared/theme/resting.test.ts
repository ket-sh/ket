import { describe, expect, it } from 'vitest';

import { restingOf } from './resting.ts';
import { THEMES } from './themes.ts';

function litOf(base: string): number {
  const channelAt = (from: number): number => Number.parseInt(base.slice(from, from + 2), 16);

  return (channelAt(1) + channelAt(3) + channelAt(5)) / (3 * 255);
}

describe('the theme the wardrobe rests in for a terminal', () => {
  it('rests in kanagawa under a dark terminal', () => {
    expect(THEMES[restingOf('dark')]?.[0]).toBe('kanagawa');
  });

  it('rests in kanagawa when the terminal never answers', () => {
    expect(THEMES[restingOf(null)]?.[0]).toBe('kanagawa');
  });

  it('rests in a lit theme under a light terminal', () => {
    expect(litOf(THEMES[restingOf('light')]?.[1].base ?? '#000000')).toBeGreaterThan(0.5);
  });
});
