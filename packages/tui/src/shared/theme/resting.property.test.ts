import type { ThemeMode } from '@opentui/core';

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { restingOf } from './resting.ts';
import { THEMES } from './themes.ts';

function litOf(base: string): number {
  const channelAt = (from: number): number => Number.parseInt(base.slice(from, from + 2), 16);

  return (channelAt(1) + channelAt(3) + channelAt(5)) / (3 * 255);
}

function groundsAsTheTerminalDoes(mode: ThemeMode | null): void {
  const worn = THEMES[restingOf(mode)]?.[1];

  expect(litOf(worn?.base ?? '#000000') > 0.5).toBe(mode === 'light');
}

describe('the ground the wardrobe always rests on', () => {
  it('matches the terminal for any scheme it is told about', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<ThemeMode | null>('dark', 'light', null),
        groundsAsTheTerminalDoes,
      ),
    );
  });
});
