import { createMockKeys } from '@opentui/core/testing';
import { testRender } from '@opentui/react/test-utils';
import { afterEach, describe, expect, it } from 'bun:test';

import type { ActedFeed } from './watch-fixtures.ts';

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

type Press = string | { key: string; lands?: string; leaves?: string };

function settledDown(press: Press): (frame: string) => boolean {
  if (typeof press === 'string') {
    return () => true;
  }

  return (frame) =>
    (press.lands === undefined || frame.includes(press.lands)) &&
    (press.leaves === undefined || !frame.includes(press.leaves));
}

async function landed(done: (frame: string) => boolean): Promise<string> {
  const started = Date.now();
  let frame = await settled();

  while (!done(frame) && Date.now() - started < 15_000) {
    frame = await settled();
  }

  return frame;
}

async function opening(presses: Press[], feed: ActedFeed = feedOf()): Promise<string> {
  const opened = await testRender(
    <WatchPage feed={feed} clock={() => NOW} onQuit={() => undefined} />,
    { width: 160, height: 40 },
  );

  rendered = opened;

  let frame = await landed((seen) => seen.includes('K-2'));

  for (const press of presses) {
    createMockKeys(opened.renderer).pressKey(typeof press === 'string' ? press : press.key);
    frame = await landed(settledDown(press));
  }

  return frame;
}

function chosenRow(frame: string): string {
  return frame.split('\n').find((row) => row.includes('►')) ?? '';
}

const LAID_FLAT: Press = { key: 'v', lands: 'v kanban' };

describe('the list the board also wears', () => {
  it('offers the list from the kanban and names it', async () => {
    const frame = await opening([]);

    expect(frame).toContain('v list');
  });

  it('swaps to the list on v and names the kanban', async () => {
    const frame = await opening([LAID_FLAT]);

    expect(frame).toContain('v kanban');
    expect(frame).not.toContain('v list');
  });

  it('shows key, stage, age, title and the refusal at the end of a row', async () => {
    const frame = await opening([LAID_FLAT]);

    expect(frame).toContain('K-1');
    expect(frame).toContain('designing');
    expect(frame).toContain('2h');
    expect(frame).toContain('The watched item');
    expect(frame).toContain('no spec named');
  });

  it('walks the flat list with up and down', async () => {
    const frame = await opening([LAID_FLAT, { key: 'ARROW_DOWN', lands: '► K-1' }]);

    expect(chosenRow(frame)).toContain('K-1');
  });

  it('opens the journey from a list row', async () => {
    const frame = await opening([LAID_FLAT, { key: 'RETURN', lands: 'K-2 · journey' }]);

    expect(frame).toContain('K-2 · journey');
  });

  it('offers the same gates from a list row', async () => {
    const frame = await opening([LAID_FLAT, { key: 'a', lands: 'approve gate' }]);

    expect(frame).toContain('approve gate');
  });

  it('keeps the selection on a card a gate just moved', async () => {
    await opening([
      LAID_FLAT,
      { key: 'a', lands: 'approve gate' },
      { key: 'RETURN', lands: '✓ passed' },
    ]);

    const frame = await landed((seen) => !seen.includes('approve gate'));
    const row = chosenRow(frame);

    expect(row).toContain('K-2');
    expect(row).toContain('implementing');
  }, 20_000);
});
