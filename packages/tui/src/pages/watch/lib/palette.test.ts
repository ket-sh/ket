import { describe, expect, it } from 'vitest';

import type { KanbanCardView, KanbanColumnView } from '../../../shared/model';

import { destinationsOf, siftedBy } from './palette.ts';

function cardOf(
  key: string,
  status: string,
  title: string,
  offers: KanbanCardView['offers'],
): KanbanCardView {
  return {
    key,
    title,
    size: 'story',
    status,
    parent: undefined,
    since: undefined,
    refusal: undefined,
    note: undefined,
    offers,
  };
}

const QUIET = cardOf('K-2', 'triaged', 'A quiet fix', ['approve']);

const BOARD: KanbanColumnView[] = [
  { status: 'triaged', cards: [QUIET] },
  { status: 'designing', cards: [cardOf('K-1', 'designing', 'The watched item', [])] },
];

function labelsOf(entries: { label: string }[]): string[] {
  return entries.map((entry) => entry.label);
}

describe('the destinations the palette lists', () => {
  it('leads with the screens, then the items, then what the seat offers', () => {
    expect(labelsOf(destinationsOf(BOARD, QUIET))).toStrictEqual([
      'board',
      'list',
      'backlog',
      'map',
      'oplog',
      'K-2  A quiet fix',
      'K-1  The watched item',
      'approve K-2',
      'refresh',
      'themes',
    ]);
  });

  it('offers no gate while no card holds the seat', () => {
    const labels = labelsOf(destinationsOf(BOARD, undefined));

    expect(labels).toContain('board');
    expect(labels).not.toContain('approve K-2');
  });

  it('carries each item stage so the row can wear its color', () => {
    const item = destinationsOf(BOARD, undefined).find((entry) => entry.kind === 'item');

    expect(item).toMatchObject({ key: 'K-2', status: 'triaged' });
  });
});

describe('the thread a query pulls through the list', () => {
  const entries = [
    { label: 'board' },
    { label: 'K-2  A quiet fix' },
    { label: 'K-1  The watched item' },
  ];

  it('keeps everything, in order, on an empty query', () => {
    expect(siftedBy(entries, '')).toStrictEqual(entries);
  });

  it('keeps only the labels the query threads through', () => {
    expect(labelsOf(siftedBy(entries, 'qfix'))).toStrictEqual(['K-2  A quiet fix']);
  });

  it('threads whatever the case', () => {
    expect(labelsOf(siftedBy(entries, 'k-2'))).toStrictEqual(['K-2  A quiet fix']);
  });

  it('puts the tighter thread first', () => {
    const loose = { label: 'a lazy dog' };
    const tight = { label: 'lady' };

    expect(siftedBy([loose, tight], 'lad')).toStrictEqual([tight, loose]);
  });

  it('keeps the standing order between equal threads', () => {
    const board = { label: 'board' };
    const backlog = { label: 'backlog' };

    expect(siftedBy([board, backlog], 'b')).toStrictEqual([board, backlog]);
  });
});
