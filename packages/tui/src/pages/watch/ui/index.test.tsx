import { testRender } from '@opentui/react/test-utils';
import { afterEach, describe, expect, it } from 'bun:test';

import type { BoardFeed } from '../../../shared/model';

import { KanbanPage } from './index.tsx';

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

function feedOf(): BoardFeed {
  return {
    snapshot: async () => {
      await Promise.resolve();

      return COLUMNS;
    },
    subscribe: () => () => undefined,
  };
}

let rendered: Awaited<ReturnType<typeof testRender>> | undefined;

afterEach(() => {
  rendered?.renderer.destroy();
  rendered = undefined;
});

async function frameOf(width: number, height: number): Promise<string> {
  rendered = await testRender(
    <KanbanPage feed={feedOf()} clock={() => NOW} onQuit={() => undefined} />,
    { width, height },
  );

  await rendered.renderOnce();
  await new Promise((settle) => {
    setTimeout(settle, 25);
  });
  await rendered.renderOnce();

  return rendered.captureCharFrame();
}

describe('the kanban page', () => {
  it('seats every card under the column its status names', async () => {
    const frame = await frameOf(160, 30);

    expect(frame).toContain('triaged');
    expect(frame).toContain('designing');
    expect(frame).toContain('K-2');
    expect(frame).toContain('A quiet fix');
    expect(frame).toContain('K-1');
    expect(frame).toContain('The watched item');
  });

  it('shows how long a card has sat where it is', async () => {
    const frame = await frameOf(160, 30);

    expect(frame).toContain('2h');
  });

  it('wears the refusal that is still standing', async () => {
    const frame = await frameOf(160, 30);

    expect(frame).toContain('! the design names no spec');
  });

  it('hides an empty column, since dead lanes are noise', async () => {
    const frame = await frameOf(160, 30);

    expect(frame).not.toContain('awaiting-merge');
  });

  it('stacks the board as a list where a row of columns cannot fit', async () => {
    const frame = await frameOf(60, 40);

    expect(frame).toContain('K-1');
    expect(frame).toContain('K-2');
  });
});
