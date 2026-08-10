import { createMockKeys } from '@opentui/core/testing';
import { testRender } from '@opentui/react/test-utils';
import { afterEach, describe, expect, it, setDefaultTimeout } from 'bun:test';

import type { ActedFeed } from './watch-fixtures.ts';

import { WatchPage } from './index.tsx';
import { feedOf, NOW, refusingFeedOf } from './watch-fixtures.ts';

setDefaultTimeout(40_000);

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

async function opened(feed: ActedFeed, presses: string[]): Promise<string> {
  const shown = await testRender(
    <WatchPage feed={feed} clock={() => NOW} onQuit={() => undefined} />,
    { width: 160, height: 40 },
  );

  rendered = shown;

  let frame = await landed((seen) => seen.includes('K-2'));

  for (const key of presses) {
    const before = frame;

    createMockKeys(shown.renderer).pressKey(key);
    frame = await landed((seen) => seen !== before);
  }

  return frame;
}

describe('the cursor the unfiled shelf holds', () => {
  it('marks the unfiled story it rests on once the filed rows run out', async () => {
    expect(await opened(feedOf(), ['b', 'ARROW_DOWN'])).toMatch(/► st-see/u);
  });

  it('hands the cursor back to the filed cards from the first unfiled row', async () => {
    const frame = await opened(feedOf(), ['b', 'ARROW_DOWN', 'ARROW_UP']);

    expect(frame).not.toMatch(/► st-see/u);
    expect(frame).toMatch(/► K-2/u);
  });

  it('walks down the shelf to the story below', async () => {
    expect(await opened(feedOf(), ['b', 'ARROW_DOWN', 'ARROW_DOWN'])).toMatch(/► st-card/u);
  });
});

describe('filing an unfiled story from the backlog', () => {
  it('files the highlighted story through the feed', async () => {
    const feed = feedOf();

    await opened(feed, ['b', 'ARROW_DOWN', 'p']);

    expect(feed.acted).toContain('st-see promote');
  });

  it('takes the filed story off the shelf and stands it among the cards', async () => {
    const frame = await opened(feedOf(), ['b', 'ARROW_DOWN', 'p']);

    expect(frame).not.toContain('st-see');
    expect(frame).toContain('see the shelves');
  });

  it('surfaces the refusal where the map will not let the story be filed', async () => {
    const frame = await opened(refusingFeedOf(), ['b', 'ARROW_DOWN', 'p']);

    expect(frame).toContain('refused');
    expect(frame).toContain('already filed');
  });
});

describe('the unassigned bucket the backlog can pull onto the shelf', () => {
  it('stands the bucket on the shelf on u', async () => {
    expect(await opened(feedOf(), ['b', 'u'])).toContain('ask for a refund');
  });

  it('puts the bucket away again on a second press', async () => {
    expect(await opened(feedOf(), ['b', 'u', 'u'])).not.toContain('ask for a refund');
  });
});
