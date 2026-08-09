import { createMockKeys } from '@opentui/core/testing';
import { testRender } from '@opentui/react/test-utils';
import { afterEach, describe, expect, it, setDefaultTimeout } from 'bun:test';

// The landed() waits commit to a 15s deadline; a loaded runner can spend more
// than bun's 5s default across two of them before a frame settles.
setDefaultTimeout(40_000);

import { WatchPage } from './index.tsx';
import { feedOf, NOW } from './watch-fixtures.ts';

let rendered: Awaited<ReturnType<typeof testRender>> | undefined;

afterEach(() => {
  rendered?.renderer.destroy();
  rendered = undefined;
});

async function settled(): Promise<string> {
  await rendered?.renderOnce();
  await new Promise((rested) => {
    setTimeout(rested, 25);
  });
  await rendered?.renderOnce();

  return rendered?.captureCharFrame() ?? '';
}

async function landed(done: (frame: string) => boolean): Promise<string> {
  const started = Date.now();
  let frame = await settled();

  while (!done(frame) && Date.now() - started < 15_000) {
    frame = await settled();
  }

  return frame;
}

function pressedTimes(key: string, times: number): void {
  if (rendered === undefined) {
    return;
  }

  const keys = createMockKeys(rendered.renderer);

  for (let held = 0; held < times; held += 1) {
    keys.pressKey(key);
  }
}

async function openedOverview(): Promise<string> {
  const opened = await testRender(
    <WatchPage feed={feedOf()} clock={() => NOW} onQuit={() => undefined} />,
    { width: 160, height: 40 },
  );

  rendered = opened;
  await landed((seen) => seen.includes('K-2'));

  const keys = createMockKeys(opened.renderer);

  keys.pressKey('ARROW_RIGHT');
  await landed((seen) => seen.includes('║ K-1'));
  keys.pressKey('RETURN');
  await landed((seen) => seen.includes('K-1 · journey'));
  keys.pressKey('TAB');

  return landed((seen) => seen.includes('The keeper locks'));
}

describe('the overview as a markdown preview', () => {
  it('conceals the markers and keeps the words', async () => {
    const frame = await openedOverview();

    expect(frame).toContain('Acceptance');
    expect(frame).toContain('counts');
    expect(frame).not.toContain('##');
    expect(frame).not.toContain('**');
  });

  it('walks the preview down with j and back up with k', async () => {
    await openedOverview();
    pressedTimes('j', 10);

    const dived = await landed((seen) => !seen.includes('over 01'));

    expect(dived).not.toContain('over 01');
    expect(dived).toContain('over 30');

    pressedTimes('k', 10);

    const back = await landed((seen) => seen.includes('over 01'));

    expect(back).toContain('over 01');
  });

  it('names the scroll in the key bar instead of the canvas walk', async () => {
    const frame = await openedOverview();

    expect(frame).toContain('↑↓ j k scroll');
    expect(frame).not.toContain('⏎ open');
  });
});
