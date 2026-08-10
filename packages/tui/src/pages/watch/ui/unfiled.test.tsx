import { createMockKeys } from '@opentui/core/testing';
import { testRender } from '@opentui/react/test-utils';
import { afterEach, describe, expect, it } from 'bun:test';

import type { ActedFeed } from './watch-fixtures.ts';

import { WatchPage } from './index.tsx';
import { feedOf, filedFeedOf, NOW } from './watch-fixtures.ts';

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

async function queuedWith(feed: ActedFeed): Promise<string> {
  const opened = await testRender(
    <WatchPage feed={feed} clock={() => NOW} onQuit={() => undefined} />,
    { width: 160, height: 40 },
  );

  rendered = opened;

  const board = await landed((seen) => seen.includes('K-2'));

  createMockKeys(opened.renderer).pressKey('b');

  return landed((seen) => seen !== board);
}

async function queued(): Promise<string> {
  return queuedWith(feedOf());
}

describe('the unfiled stories the backlog stands beneath its cards', () => {
  it('names each unfiled story by its map id and its title, with no stage between them', async () => {
    expect(await queued()).toMatch(/st-see\s+see the shelves/u);
  });

  it('names the release the unfiled stories are waiting in', async () => {
    expect(await queued()).toContain('walking skeleton');
  });

  it('keeps the filed cards on the shelf above the unfiled stories', async () => {
    const frame = await queued();

    expect(frame.indexOf('K-2')).toBeLessThan(frame.indexOf('st-see'));
  });

  it('leaves the unassigned bucket off the shelf until it is asked for', async () => {
    expect(await queued()).not.toContain('ask for a refund');
  });

  it('stands no shelf at all where the map leaves nothing unfiled', async () => {
    const frame = await queuedWith(filedFeedOf());

    expect(frame).toContain('K-2');
    expect(frame).not.toContain('unfiled');
  });
});
