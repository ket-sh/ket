import { describe, expect, it } from 'vitest';

import { foldKanban } from './kanban.ts';

const STORED = [
  {
    key: 'K-1',
    contents: 'title: The watched item\nkind: feature\nsize: story\nstatus: designing\n',
  },
  {
    key: 'K-2',
    contents: 'title: A quiet fix\nkind: bug\nsize: subtask\nstatus: triaged\n',
  },
];

function line(event: object): string {
  return `${JSON.stringify(event)}\n`;
}

function cardsAt(columns: ReturnType<typeof foldKanban>, status: string) {
  return columns.find((column) => column.status === status)?.cards ?? [];
}

describe('the columns a board always shows', () => {
  it('shows every pipeline status in order, empty or not', () => {
    expect(foldKanban([], '').map((column) => column.status)).toStrictEqual([
      'idea',
      'triaged',
      'designing',
      'awaiting-approval',
      'implementing',
      'verifying',
      'awaiting-merge',
      'shipped',
    ]);
  });

  it('seats every stored item in the column its status names', () => {
    const columns = foldKanban(STORED, '');

    expect(cardsAt(columns, 'designing').map((card) => card.key)).toStrictEqual(['K-1']);
    expect(cardsAt(columns, 'triaged').map((card) => card.title)).toStrictEqual(['A quiet fix']);
  });

  it('skips an item whose manifest it cannot read, rather than inventing one', () => {
    const columns = foldKanban([{ key: 'K-9', contents: 'not yaml at all' }], '');

    expect(columns.flatMap((column) => column.cards)).toStrictEqual([]);
  });
});

describe('what the log adds to a card', () => {
  it('dates the card from the move that reached its current status', () => {
    const log =
      line({
        gate: 'transition',
        outcome: 'allowed',
        about: 'triaged',
        item: 'K-1',
        at: '2026-08-07T09:00:00.000Z',
      }) +
      line({
        gate: 'transition',
        outcome: 'allowed',
        about: 'designing',
        item: 'K-1',
        at: '2026-08-07T10:00:00.000Z',
      });

    const [card] = cardsAt(foldKanban(STORED, log), 'designing');

    expect(card?.since).toBe('2026-08-07T10:00:00.000Z');
  });

  it('ignores a move toward a status the store no longer holds', () => {
    const log = line({
      gate: 'transition',
      outcome: 'allowed',
      about: 'implementing',
      item: 'K-1',
      at: '2026-08-07T12:00:00.000Z',
    });

    const [card] = cardsAt(foldKanban(STORED, log), 'designing');

    expect(card?.since).toBeUndefined();
  });
});

describe('the refusals a card wears', () => {
  it('carries the last refusal since the card arrived where it is', () => {
    const log =
      line({
        gate: 'transition',
        outcome: 'allowed',
        about: 'designing',
        item: 'K-1',
        at: '2026-08-07T10:00:00.000Z',
      }) +
      line({
        gate: 'transition',
        outcome: 'refused',
        about: 'not ready',
        item: 'K-1',
        reason: 'the design names no spec',
        at: '2026-08-07T11:00:00.000Z',
      });

    const [card] = cardsAt(foldKanban(STORED, log), 'designing');

    expect(card?.refusal).toStrictEqual({
      reason: 'the design names no spec',
      at: '2026-08-07T11:00:00.000Z',
    });
  });

  it('drops a refusal the card has already moved past', () => {
    const log =
      line({
        gate: 'write',
        outcome: 'refused',
        about: 'src/a.ts',
        item: 'K-1',
        reason: 'no failing test',
        at: '2026-08-07T09:30:00.000Z',
      }) +
      line({
        gate: 'transition',
        outcome: 'allowed',
        about: 'designing',
        item: 'K-1',
        at: '2026-08-07T10:00:00.000Z',
      });

    const [card] = cardsAt(foldKanban(STORED, log), 'designing');

    expect(card?.refusal).toBeUndefined();
  });
});

describe('what the fold reads past', () => {
  it('reads past junk lines and lines about items the store never had', () => {
    const log =
      'not json\n' +
      line({
        gate: 'transition',
        outcome: 'allowed',
        about: 'designing',
        item: 'GONE-1',
        at: '2026-08-07T10:00:00.000Z',
      }) +
      line({
        gate: 'transition',
        outcome: 'allowed',
        about: 'designing',
        item: 'K-1',
        at: '2026-08-07T10:00:00.000Z',
      });

    const [card] = cardsAt(foldKanban(STORED, log), 'designing');

    expect(card?.since).toBe('2026-08-07T10:00:00.000Z');
    expect(foldKanban(STORED, log).flatMap((column) => column.cards)).toHaveLength(2);
  });
});
