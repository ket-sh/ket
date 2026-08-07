import { createMockKeys } from '@opentui/core/testing';
import { testRender } from '@opentui/react/test-utils';
import { afterEach, describe, expect, it } from 'bun:test';

import type { BoardFeed, JourneyView } from '../../../shared/model';

import { WatchPage } from './index.tsx';

const NOW = '2026-08-07T12:00:00.000Z';

const COLUMNS = [
  { status: 'idea', cards: [] },
  {
    status: 'triaged',
    cards: [
      {
        key: 'K-2',
        title: 'A quiet fix',
        size: 'subtask',
        status: 'triaged',
        since: undefined,
        refusal: undefined,
      },
    ],
  },
  {
    status: 'designing',
    cards: [
      {
        key: 'K-1',
        title: 'The watched item',
        size: 'story',
        status: 'designing',
        since: '2026-08-07T10:00:00.000Z',
        refusal: { reason: 'the design names no spec', at: '2026-08-07T11:00:00.000Z' },
      },
    ],
  },
  { status: 'awaiting-approval', cards: [] },
  { status: 'implementing', cards: [] },
  { status: 'verifying', cards: [] },
  { status: 'awaiting-merge', cards: [] },
  { status: 'shipped', cards: [] },
];

const JOURNEY: JourneyView = {
  item: 'K-1',
  title: 'The watched item',
  nodes: [
    {
      id: 'triaged',
      kind: 'stage',
      title: 'triaged',
      mark: 'done',
      at: '2026-08-07T09:00:00.000Z',
      child: undefined,
    },
    {
      id: 'designing',
      kind: 'stage',
      title: 'designing',
      mark: 'active',
      at: '2026-08-07T10:00:00.000Z',
      child: undefined,
    },
    {
      id: 'K-2',
      kind: 'child',
      title: 'K-2 A quiet fix',
      mark: 'active',
      at: undefined,
      child: 'K-2',
    },
  ],
  edges: [
    ['triaged', 'designing'],
    ['designing', 'K-2'],
  ],
  standing: 'no failing test covers it',
};

function feedOf(): BoardFeed {
  return {
    snapshot: async () => {
      await Promise.resolve();

      return COLUMNS;
    },
    journey: async (key) => {
      await Promise.resolve();

      return key === 'K-1' ? JOURNEY : undefined;
    },
    subscribe: () => () => undefined,
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

async function openedAt(width: number, height: number): Promise<string> {
  rendered = await testRender(
    <WatchPage feed={feedOf()} clock={() => NOW} onQuit={() => undefined} />,
    { width, height },
  );

  return settled();
}

function pressed(key: 'ARROW_RIGHT' | 'ARROW_LEFT' | 'RETURN' | 'ESCAPE'): void {
  if (rendered !== undefined) {
    createMockKeys(rendered.renderer).pressKey(key);
  }
}

describe('the board the watch page shows', () => {
  it('seats every card under the column its status names', async () => {
    const frame = await openedAt(160, 30);

    expect(frame).toContain('triaged');
    expect(frame).toContain('designing');
    expect(frame).toContain('K-2');
    expect(frame).toContain('A quiet fix');
    expect(frame).toContain('K-1');
    expect(frame).toContain('The watched item');
  });

  it('shows how long a card has sat where it is', async () => {
    expect(await openedAt(160, 30)).toContain('2h');
  });

  it('wears the refusal that is still standing', async () => {
    expect(await openedAt(160, 30)).toContain('! the design names no spec');
  });

  it('hides an empty column, since dead lanes are noise', async () => {
    expect(await openedAt(160, 30)).not.toContain('awaiting-merge');
  });

  it('stacks the board as a list where a row of columns cannot fit', async () => {
    const frame = await openedAt(60, 40);

    expect(frame).toContain('K-1');
    expect(frame).toContain('K-2');
  });
});

describe('the selection the arrows move', () => {
  it('starts on the first card and wears the double border', async () => {
    expect(await openedAt(160, 30)).toContain('║ K-2');
  });

  it('walks right into the next living column', async () => {
    await openedAt(160, 30);
    pressed('ARROW_RIGHT');

    const frame = await settled();

    expect(frame).toContain('║ K-1');
    expect(frame).not.toContain('║ K-2');
  });
});

describe('the journey a card opens', () => {
  it('dives into the journey on enter and spells the path', async () => {
    await openedAt(160, 40);
    pressed('ARROW_RIGHT');
    await settled();
    pressed('RETURN');

    const frame = await settled();

    expect(frame).toContain('K-1 · journey');
    expect(frame).toContain('board › K-1');
    expect(frame).toContain('! no failing test covers it');
  });

  it('lands the selection on the active stage, never on an active child', async () => {
    await openedAt(160, 40);
    pressed('ARROW_RIGHT');
    await settled();
    pressed('RETURN');

    expect(await settled()).toContain('║ designing');
  });

  it('walks the canvas selection with the arrows', async () => {
    await openedAt(160, 40);
    pressed('ARROW_RIGHT');
    await settled();
    pressed('RETURN');
    await settled();
    pressed('ARROW_LEFT');

    const frame = await settled();

    expect(frame).toContain('║ triaged');
  });

  it('pops back to the board on escape', async () => {
    await openedAt(160, 40);
    pressed('ARROW_RIGHT');
    await settled();
    pressed('RETURN');
    await settled();
    pressed('ESCAPE');

    const frame = await settled();

    expect(frame).not.toContain('K-1 · journey');
    expect(frame).toContain('A quiet fix');
  });
});
