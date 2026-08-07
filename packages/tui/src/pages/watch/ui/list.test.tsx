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

async function opening(keys: string[], feed: ActedFeed = feedOf()): Promise<string> {
  const opened = await testRender(
    <WatchPage feed={feed} clock={() => NOW} onQuit={() => undefined} />,
    { width: 160, height: 40 },
  );

  rendered = opened;

  let frame = await settled();

  for (const key of keys) {
    createMockKeys(opened.renderer).pressKey(key);
    frame = await settled();
  }

  return frame;
}

async function until(seen: (frame: string) => boolean, patience: number): Promise<string> {
  const started = Date.now();
  let frame = await settled();

  while (Date.now() - started < patience && !seen(frame)) {
    frame = await settled();
  }

  return frame;
}

function chosenRow(frame: string): string {
  return frame.split('\n').find((row) => row.includes('►')) ?? '';
}

describe('the list the board also wears', () => {
  it('offers the list from the kanban and names it', async () => {
    const frame = await opening([]);

    expect(frame).toContain('v list');
  });

  it('swaps to the list on v and names the kanban', async () => {
    const frame = await opening(['v']);

    expect(frame).toContain('v kanban');
    expect(frame).not.toContain('v list');
  });

  it('shows key, stage, age, title and the refusal at the end of a row', async () => {
    const frame = await opening(['v']);

    expect(frame).toContain('K-1');
    expect(frame).toContain('designing');
    expect(frame).toContain('2h');
    expect(frame).toContain('The watched item');
    expect(frame).toContain('the design names no spec');
  });

  it('walks the flat list with up and down', async () => {
    const frame = await opening(['v', 'ARROW_DOWN']);

    expect(chosenRow(frame)).toContain('K-1');
  });

  it('opens the journey from a list row', async () => {
    const frame = await opening(['v', 'RETURN']);

    expect(frame).toContain('K-2 · journey');
  });

  it('offers the same gates from a list row', async () => {
    const frame = await opening(['v', 'a']);

    expect(frame).toContain('approve gate');
  });

  it('keeps the selection on a card a gate just moved', async () => {
    await opening(['v', 'a', 'RETURN']);

    const frame = await until((seen) => !seen.includes('approve gate'), 5000);
    const row = chosenRow(frame);

    expect(row).toContain('K-2');
    expect(row).toContain('implementing');
  }, 8000);
});
