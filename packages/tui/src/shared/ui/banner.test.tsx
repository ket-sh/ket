import { testRender } from '@opentui/react/test-utils';
import { afterEach, describe, expect, it } from 'bun:test';

import { ThemeProvider } from '../theme';
import { Banner } from './banner.tsx';

let rendered: Awaited<ReturnType<typeof testRender>> | undefined;

afterEach(() => {
  rendered?.renderer.destroy();
  rendered = undefined;
});

async function drawn(tick: number): Promise<string> {
  rendered = await testRender(
    <ThemeProvider>
      <Banner tick={tick} />
    </ThemeProvider>,
    { width: 60, height: 6 },
  );

  await rendered.renderOnce();
  await new Promise((rested) => {
    setTimeout(rested, 25);
  });
  await rendered.renderOnce();

  return rendered.captureCharFrame();
}

describe('the banner over the watch', () => {
  it('raises the torii beside the block letters', async () => {
    const frame = await drawn(0);

    expect(frame).toContain('▄▄█▄▄▄█▄▄');
    expect(frame).toContain('█ ▄▀  █▀▀  ▀█▀');
    expect(frame).toContain('█ ▀▄  █▄▄   █');
  });
});
