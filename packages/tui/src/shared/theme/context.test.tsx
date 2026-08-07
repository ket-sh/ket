import type { ReactNode } from 'react';

import { testRender } from '@opentui/react/test-utils';
import { afterEach, describe, expect, it } from 'bun:test';
import { useEffect } from 'react';

import { ThemeProvider, useTheme } from './context.tsx';
import { THEMES } from './themes.ts';

let rendered: Awaited<ReturnType<typeof testRender>> | undefined;

afterEach(() => {
  rendered?.renderer.destroy();
  rendered = undefined;
});

async function worn(dress: (wardrobe: ReturnType<typeof useTheme>) => void): Promise<string> {
  function Probe(): ReactNode {
    const wardrobe = useTheme();

    useEffect(() => {
      dress(wardrobe);
    }, [wardrobe]);

    return <text>{`wearing ${wardrobe.name}`}</text>;
  }

  rendered = await testRender(
    <ThemeProvider>
      <Probe />
    </ThemeProvider>,
    { width: 60, height: 4 },
  );

  await rendered.renderOnce();
  await new Promise((rested) => {
    setTimeout(rested, 25);
  });
  await rendered.renderOnce();

  return rendered.captureCharFrame();
}

const SECOND = THEMES[1]?.[0] ?? '';

describe('the theme the provider dresses the app in', () => {
  it('wears kanagawa until told otherwise', async () => {
    expect(await worn(() => undefined)).toContain('wearing kanagawa');
  });

  it('wears a preview the moment it is asked', async () => {
    expect(
      await worn((wardrobe) => {
        wardrobe.preview(1);
      }),
    ).toContain(`wearing ${SECOND}`);
  });

  it('keeps a theme for good', async () => {
    expect(
      await worn((wardrobe) => {
        wardrobe.keep(1);
      }),
    ).toContain(`wearing ${SECOND}`);
  });

  it('reverts a preview to the kept theme', async () => {
    const frame = await worn((wardrobe) => {
      wardrobe.preview(1);
      wardrobe.revert();
    });

    expect(frame).toContain('wearing kanagawa');
  });
});
