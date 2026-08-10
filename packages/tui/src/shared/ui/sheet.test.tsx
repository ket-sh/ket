import type { ReactNode } from 'react';

import { rgbToHex } from '@opentui/core';
import { testRender } from '@opentui/react/test-utils';
import { afterEach, describe, expect, it } from 'bun:test';
import { useEffect } from 'react';

import { KANAGAWA, THEMES, ThemeProvider, useTheme } from '../theme';
import { Sheet } from './sheet.tsx';

let rendered: Awaited<ReturnType<typeof testRender>> | undefined;

afterEach(() => {
  rendered?.renderer.destroy();
  rendered = undefined;
});

function litOf(base: string): number {
  const channelAt = (from: number): number => Number.parseInt(base.slice(from, from + 2), 16);

  return (channelAt(1) + channelAt(3) + channelAt(5)) / (3 * 255);
}

const LIT = THEMES.findIndex(([, theme]) => litOf(theme.base) > 0.5);

const LIT_WORN = THEMES[LIT]?.[1];

async function ground(dress: (wardrobe: ReturnType<typeof useTheme>) => void): Promise<string> {
  function Probe(): ReactNode {
    const wardrobe = useTheme();

    useEffect(() => {
      dress(wardrobe);
    }, [wardrobe]);

    return <text>{'the sheet'}</text>;
  }

  rendered = await testRender(
    <ThemeProvider>
      <Sheet />
      <Probe />
    </ThemeProvider>,
    { width: 24, height: 4 },
  );

  await rendered.renderOnce();
  await new Promise((rested) => {
    setTimeout(rested, 25);
  });
  await rendered.renderOnce();

  const first = rendered.captureSpans().lines.flatMap((line) => line.spans)[0];

  return first === undefined ? '' : rgbToHex(first.bg).toLowerCase();
}

describe('the sheet the screen stands on', () => {
  it('grounds every cell in the worn theme base', async () => {
    expect(await ground(() => undefined)).toBe(KANAGAWA.base.toLowerCase());
  });

  it('repaints the ground when the wardrobe changes theme', async () => {
    const painted = await ground((wardrobe) => {
      wardrobe.keep(LIT);
    });

    expect(painted).toBe(LIT_WORN?.base.toLowerCase() ?? 'the wardrobe lost its light themes');
  });
});
