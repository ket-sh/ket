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

function moved(item: string, to: string, at?: string): string {
  return `${JSON.stringify({ gate: 'transition', outcome: 'allowed', about: to, item, at })}\n`;
}

function turnedAway(item: string, about: string, at?: string, reason?: string): string {
  return `${JSON.stringify({ gate: 'write', outcome: 'refused', about, item, at, reason })}\n`;
}

function cardsAt(columns: ReturnType<typeof foldKanban>, status: string) {
  return columns.find((column) => column.status === status)?.cards ?? [];
}

function cardOf(log: string) {
  return cardsAt(foldKanban(STORED, log), 'designing')[0];
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

  it('carries the kind the item declares, so a facet can narrow by it', () => {
    const columns = foldKanban(STORED, '');

    expect(cardsAt(columns, 'designing').map((card) => card.kind)).toStrictEqual(['feature']);
    expect(cardsAt(columns, 'triaged').map((card) => card.kind)).toStrictEqual(['bug']);
  });

  it('skips an item whose manifest it cannot read, rather than inventing one', () => {
    const columns = foldKanban([{ key: 'K-9', contents: 'not yaml at all' }], '');

    expect(columns.flatMap((column) => column.cards)).toStrictEqual([]);
  });

  it('hands every card the gates its status offers', () => {
    const stored = [
      {
        key: 'K-3',
        contents: 'title: The merged work\nkind: feature\nsize: story\nstatus: awaiting-merge\n',
      },
    ];

    expect(cardsAt(foldKanban(stored, ''), 'awaiting-merge')[0]?.offers).toStrictEqual([
      'ship',
      'reopen',
    ]);
  });
});

describe('the moment a card is dated from', () => {
  it('dates the card from the move that reached its current status', () => {
    const log =
      moved('K-1', 'triaged', '2026-08-07T09:00:00.000Z') +
      moved('K-1', 'designing', '2026-08-07T10:00:00.000Z');

    expect(cardOf(log)?.since).toBe('2026-08-07T10:00:00.000Z');
  });

  it('dates a returning card from its latest arrival, never its first', () => {
    const log =
      moved('K-1', 'designing', '2026-08-07T08:00:00.000Z') +
      moved('K-1', 'implementing', '2026-08-07T09:00:00.000Z') +
      moved('K-1', 'designing', '2026-08-07T10:00:00.000Z');

    expect(cardOf(log)?.since).toBe('2026-08-07T10:00:00.000Z');
  });

  it('reads only the moves of the card itself, never a neighbor', () => {
    const log =
      moved('K-1', 'designing', '2026-08-07T10:00:00.000Z') +
      moved('GONE-1', 'designing', '2026-08-07T11:00:00.000Z');

    expect(cardOf(log)?.since).toBe('2026-08-07T10:00:00.000Z');
  });

  it('reads arrivals from transitions alone, never another gate letting one pass', () => {
    const otherGate = `${JSON.stringify({
      gate: 'review',
      outcome: 'allowed',
      about: 'designing',
      item: 'K-1',
      at: '2026-08-07T11:00:00.000Z',
    })}\n`;

    expect(cardOf(moved('K-1', 'designing', '2026-08-07T10:00:00.000Z') + otherGate)?.since).toBe(
      '2026-08-07T10:00:00.000Z',
    );
  });

  it('never dates a card from a move the gate refused', () => {
    const refusedMove = `${JSON.stringify({
      gate: 'transition',
      outcome: 'refused',
      about: 'designing',
      item: 'K-1',
      at: '2026-08-07T11:00:00.000Z',
    })}\n`;

    expect(cardOf(moved('K-1', 'designing', '2026-08-07T10:00:00.000Z') + refusedMove)?.since).toBe(
      '2026-08-07T10:00:00.000Z',
    );
  });

  it('ignores a move toward a status the store no longer holds', () => {
    expect(cardOf(moved('K-1', 'implementing', '2026-08-07T12:00:00.000Z'))?.since).toBeUndefined();
  });
});

describe('the refusals a card wears', () => {
  const ARRIVED = moved('K-1', 'designing', '2026-08-07T10:00:00.000Z');

  it('carries the last refusal since the card arrived where it is', () => {
    const log =
      ARRIVED +
      turnedAway('K-1', 'not ready', '2026-08-07T11:00:00.000Z', 'the design names no spec');

    expect(cardOf(log)?.refusal).toStrictEqual({
      reason: 'the design names no spec',
      at: '2026-08-07T11:00:00.000Z',
      gate: 'write',
    });
  });

  it('counts a refusal landing the instant the card arrived', () => {
    const log = ARRIVED + turnedAway('K-1', 'src/a.ts', '2026-08-07T10:00:00.000Z');

    expect(cardOf(log)?.refusal?.at).toBe('2026-08-07T10:00:00.000Z');
  });

  it('speaks the refused subject when no reason was recorded', () => {
    const log = ARRIVED + turnedAway('K-1', 'src/a.ts', '2026-08-07T11:00:00.000Z');

    expect(cardOf(log)?.refusal?.reason).toBe('src/a.ts');
  });

  it('stays wordless when a refusal named neither reason nor subject', () => {
    const bare = `${JSON.stringify({
      outcome: 'refused',
      item: 'K-1',
      at: '2026-08-07T11:00:00.000Z',
    })}\n`;

    expect(cardOf(ARRIVED + bare)?.refusal).toStrictEqual({
      reason: '',
      at: '2026-08-07T11:00:00.000Z',
      gate: '',
    });
  });

  it('drops a refusal that carries no moment, since it cannot be placed', () => {
    expect(cardOf(ARRIVED + turnedAway('K-1', 'src/a.ts'))?.refusal).toBeUndefined();
  });

  it('drops a refusal the card has already moved past', () => {
    const log =
      turnedAway('K-1', 'src/a.ts', '2026-08-07T09:30:00.000Z', 'no failing test') + ARRIVED;

    expect(cardOf(log)?.refusal).toBeUndefined();
  });
});

describe('what the fold reads past', () => {
  it('reads past junk lines and lines about items the store never had', () => {
    const log = `not json\n${moved('GONE-1', 'designing', '2026-08-07T10:00:00.000Z')}${moved(
      'K-1',
      'designing',
      '2026-08-07T10:00:00.000Z',
    )}`;

    expect(cardOf(log)?.since).toBe('2026-08-07T10:00:00.000Z');
    expect(foldKanban(STORED, log).flatMap((column) => column.cards)).toHaveLength(2);
  });

  it('reads past a line that names an item and nothing else', () => {
    const log = `${JSON.stringify({ item: 'K-1' })}\n${moved(
      'K-1',
      'designing',
      '2026-08-07T10:00:00.000Z',
    )}`;

    expect(cardOf(log)?.since).toBe('2026-08-07T10:00:00.000Z');
    expect(cardOf(log)?.refusal).toBeUndefined();
  });
});
