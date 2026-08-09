import { createMockKeys } from '@opentui/core/testing';
import { testRender } from '@opentui/react/test-utils';
import { afterEach, describe, expect, it, setDefaultTimeout } from 'bun:test';

// The landed() waits commit to a 15s deadline; a loaded runner can spend more
// than bun's 5s default across two of them before a frame settles.
setDefaultTimeout(40_000);

import type { BoardFeed, KanbanCardView, KanbanColumnView } from '../../../shared/model';

import { WatchPage } from './index.tsx';
import { feedOf, NOW, STAGES } from './watch-fixtures.ts';

function shippedOf(key: string, since: string): KanbanCardView {
  return {
    key,
    title: `The work behind ${key}`,
    size: 'story',
    status: 'shipped',
    kind: 'feature',
    parent: undefined,
    since,
    refusal: undefined,
    note: undefined,
    offers: [],
  };
}

const SHIPPED_SEVEN = Array.from({ length: 7 }, (_, held) =>
  shippedOf(`K-${String(held + 10)}`, `2026-08-0${String(held + 1)}T12:00:00.000Z`),
);

const COLUMNS: KanbanColumnView[] = STAGES.map((status) => ({
  status,
  cards: status === 'shipped' ? SHIPPED_SEVEN : [],
}));

function shippedFeedOf(): BoardFeed {
  return {
    ...feedOf(),
    snapshot: async () => {
      await Promise.resolve();

      return COLUMNS.map((column) => ({ ...column, cards: [...column.cards] }));
    },
  };
}

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

async function openedShippedBoard(): Promise<ReturnType<typeof createMockKeys>> {
  const opened = await testRender(
    <WatchPage feed={shippedFeedOf()} clock={() => NOW} onQuit={() => undefined} />,
    { width: 220, height: 44 },
  );

  rendered = opened;
  await landed((seen) => seen.includes('K-16'));

  return createMockKeys(opened.renderer);
}

describe('the cap the shipped lane wears on the board', () => {
  it('shows the five newest and titles the true total', async () => {
    await openedShippedBoard();

    const frame = await landed((seen) => seen.includes('shipped 7 · last 5'));

    expect(frame).toContain('shipped 7 · last 5');
    expect(frame).toContain('K-16');
    expect(frame).toContain('K-12');
    expect(frame).not.toContain('K-11');
    expect(frame).not.toContain('K-10');
  });
});

describe('the archive screen behind the x key', () => {
  it('lists every shipped item, the newest first', async () => {
    const keys = await openedShippedBoard();

    keys.pressKey('x');

    const frame = await landed((seen) => seen.includes('archive · 7 shipped'));

    expect(frame).toContain('archive · 7 shipped');
    expect(frame).toContain('K-10');
    expect(frame.indexOf('K-16')).toBeLessThan(frame.indexOf('K-10'));
    expect(frame).toContain('x board');
  });

  it('returns to the board on a second x', async () => {
    const keys = await openedShippedBoard();

    keys.pressKey('x');
    await landed((seen) => seen.includes('archive · 7 shipped'));
    keys.pressKey('x');

    const frame = await landed((seen) => seen.includes('shipped 7 · last 5'));

    expect(frame).toContain('shipped 7 · last 5');
    expect(frame).toContain('x archive');
  });
});
