import type { ReactNode } from 'react';

import { createMockKeys } from '@opentui/core/testing';
import { testRender } from '@opentui/react/test-utils';
import { afterEach, describe, expect, it } from 'bun:test';
import { useEffect } from 'react';

import { THEMES, ThemeProvider, useTheme } from '../theme';
import { Scheme } from './scheme.tsx';

let rendered: Awaited<ReturnType<typeof testRender>> | undefined;

let worn: ReturnType<typeof useTheme> | undefined;

afterEach(() => {
  rendered?.renderer.destroy();
  rendered = undefined;
  worn = undefined;
});

function litOf(base: string): number {
  const channelAt = (from: number): number => Number.parseInt(base.slice(from, from + 2), 16);

  return (channelAt(1) + channelAt(3) + channelAt(5)) / (3 * 255);
}

const LIT_ANSWER = ']10;rgb:4c/4f/69]11;rgb:ef/f1/f5';

function Probe(): ReactNode {
  const wardrobe = useTheme();

  useEffect(() => {
    worn = wardrobe;
  }, [wardrobe]);

  return <text>{`wearing ${wardrobe.name}`}</text>;
}

async function settled(): Promise<void> {
  await rendered?.renderOnce();
  await new Promise((rested) => {
    setTimeout(rested, 25);
  });
  await rendered?.renderOnce();
}

async function opened(): Promise<void> {
  rendered = await testRender(
    <ThemeProvider>
      <Scheme />
      <Probe />
    </ThemeProvider>,
    { width: 60, height: 4 },
  );

  await settled();
}

function terminalAnswers(answer: string): void {
  if (rendered !== undefined) {
    createMockKeys(rendered.renderer).pressKey(answer);
  }
}

describe('the theme the terminal scheme seats', () => {
  it('wears a lit theme when the terminal answers light', async () => {
    await opened();
    terminalAnswers(LIT_ANSWER);
    await settled();

    expect(litOf(worn?.theme.base ?? '#000000')).toBeGreaterThan(0.5);
  });

  it('leaves a theme the reader kept alone when the terminal answers light', async () => {
    await opened();
    worn?.keep(1);
    await settled();
    terminalAnswers(LIT_ANSWER);
    await settled();

    expect(worn?.name).toBe(THEMES[1]?.[0]);
  });
});
