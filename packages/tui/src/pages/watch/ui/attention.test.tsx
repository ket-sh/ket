import { testRender } from '@opentui/react/test-utils';
import { afterEach, describe, expect, it } from 'bun:test';

import type { ActedFeed } from './watch-fixtures.ts';

import { WatchPage } from './index.tsx';
import { feedOf, NOW } from './watch-fixtures.ts';

const BELL = '🔔';

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

async function openedWith(feed: ActedFeed, rings: string[]): Promise<string> {
  rendered = await testRender(
    <WatchPage
      feed={feed}
      clock={() => NOW}
      onQuit={() => undefined}
      ring={(message) => {
        rings.push(message);
      }}
    />,
    { width: 200, height: 40 },
  );

  return landed((frame) => frame.includes('K-2'));
}

describe('the bell a waiting card wears', () => {
  it('marks the card whose refusal stands open', async () => {
    const frame = await openedWith(feedOf(), []);

    expect(frame).toContain(BELL);
  });

  it('holds the bell still rather than blinking it', async () => {
    const first = await openedWith(feedOf(), []);
    const second = await settled();

    expect(first).toContain(BELL);
    expect(second).toContain(BELL);
    expect(second).toBe(first);
  });
});

describe('the desktop bell watch rings', () => {
  it('rings once when an item enters a needs-you state', async () => {
    const feed = feedOf();
    const rings: string[] = [];
    const before = await openedWith(feed, rings);

    expect(rings).toEqual([]);

    feed.shift('K-2', 'awaiting-approval');
    await landed((frame) => frame !== before);
    await landed(() => rings.length > 0);

    expect(rings).toEqual(['K-2 needs you · awaiting-approval']);
  });

  it('never rings again for a state the viewer already saw', async () => {
    const feed = feedOf();
    const rings: string[] = [];

    await openedWith(feed, rings);
    feed.shift('K-2', 'awaiting-approval');
    await landed(() => rings.length > 0);
    feed.shift('K-2', 'awaiting-approval');
    await settled();
    await settled();

    expect(rings).toHaveLength(1);
  });

  it('stays quiet about the waiting state that was already on screen when watch opened', async () => {
    const rings: string[] = [];

    await openedWith(feedOf(), rings);
    await settled();

    expect(rings.filter((message) => message.includes('K-1'))).toEqual([]);
  });
});
