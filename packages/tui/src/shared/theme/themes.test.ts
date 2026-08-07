import { describe, expect, it } from 'vitest';

import { KANAGAWA, THEMES } from './themes.ts';

const HEX = /^#[0-9a-f]{6}$/i;

function litOf(base: string): number {
  const channelAt = (from: number): number => Number.parseInt(base.slice(from, from + 2), 16);

  return (channelAt(1) + channelAt(3) + channelAt(5)) / (3 * 255);
}

describe('the wardrobe the watch ships with', () => {
  it('carries thirteen themes with kanagawa first as the default', () => {
    expect(THEMES).toHaveLength(13);
    expect(THEMES[0]?.[0]).toBe('kanagawa');
    expect(THEMES[0]?.[1]).toBe(KANAGAWA);
  });

  it('paints every token of every theme as a hex color', () => {
    for (const [, theme] of THEMES) {
      for (const token of Object.values(theme)) {
        expect(token).toMatch(HEX);
      }
    }
  });

  it('splits nine dark from four light by the ground they paint', () => {
    const light = THEMES.filter(([, theme]) => litOf(theme.base) > 0.5);

    expect(light).toHaveLength(4);
    expect(THEMES.length - light.length).toBe(9);
  });

  it('never wears the same name twice', () => {
    const names = THEMES.map(([name]) => name);

    expect(new Set(names).size).toBe(names.length);
  });
});
