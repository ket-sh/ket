import { createMockKeys } from '@opentui/core/testing';
import { testRender } from '@opentui/react/test-utils';
import { afterEach, describe, expect, it, setDefaultTimeout } from 'bun:test';
import { act } from 'react';

const TWO_LANDED_DEADLINES_MS = 40_000;

setDefaultTimeout(TWO_LANDED_DEADLINES_MS);

import type { ActedFeed } from './watch-fixtures.ts';

import { WatchPage } from './index.tsx';
import { feedOf, NOW } from './watch-fixtures.ts';

const FAR_LANE = 'awaiting-merge 1';

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

async function committedWithoutDrawing(): Promise<void> {
  await act(async () => {
    await new Promise((rested) => {
      setTimeout(rested, 50);
    });
  });
}

async function seatedPastTheEdge(feed: ActedFeed): Promise<ReturnType<typeof createMockKeys>> {
  feed.shift('K-1', 'awaiting-merge');

  const opened = await testRender(
    <WatchPage feed={feed} clock={() => NOW} onQuit={() => undefined} />,
    { width: 80, height: 24 },
  );

  rendered = opened;
  await landed((seen) => seen.includes('K-2'));

  const keys = createMockKeys(opened.renderer);

  keys.pressKey('ARROW_RIGHT');
  await landed((seen) => seen.includes(FAR_LANE));

  return keys;
}

describe('the board keeps the seated lane in view', () => {
  it('names the chosen lane when the board returns before a frame draws it', async () => {
    const keys = await seatedPastTheEdge(feedOf());

    keys.pressKey('RETURN');
    await landed((seen) => seen.includes('K-1 · journey'));
    keys.pressKey('ESCAPE');
    await committedWithoutDrawing();

    const frame = await landed((seen) => seen.includes(FAR_LANE));

    expect(frame).toContain(FAR_LANE);
  });
});
