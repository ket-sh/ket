import { describe, expect, it } from 'vitest';

import type { KanbanCardView, KanbanColumnView } from '../../../shared/model';

import { narrowedBy } from './filter.ts';

function cardOf(key: string, status: string, title: string, kind?: string): KanbanCardView {
  return {
    key,
    title,
    size: 'story',
    status,
    kind,
    parent: undefined,
    since: undefined,
    refusal: undefined,
    note: undefined,
    offers: [],
  };
}

function boardOf(cards: KanbanCardView[]): KanbanColumnView[] {
  const stages = ['idea', 'triaged', 'designing', 'implementing', 'shipped'];

  return stages.map((status) => ({
    status,
    cards: cards.filter((card) => card.status === status),
  }));
}

const BOARD = boardOf([
  cardOf('K-1', 'designing', 'The watched item', 'feature'),
  cardOf('K-2', 'triaged', 'A quiet fix', 'bug'),
  cardOf('K-3', 'triaged', 'Pay by card'),
]);

function keysShown(columns: KanbanColumnView[]): string[] {
  return columns.flatMap((column) => column.cards.map((card) => card.key));
}

describe('what a plain word narrows the board to', () => {
  it('keeps the cards whose title carries the word', () => {
    expect(keysShown(narrowedBy(BOARD, 'quiet'))).toStrictEqual(['K-2']);
  });

  it('matches the key whatever the case', () => {
    expect(keysShown(narrowedBy(BOARD, 'k-1'))).toStrictEqual(['K-1']);
  });

  it('keeps everything on an empty query', () => {
    expect(keysShown(narrowedBy(BOARD, ''))).toStrictEqual(['K-2', 'K-3', 'K-1']);
    expect(keysShown(narrowedBy(BOARD, '   '))).toStrictEqual(['K-2', 'K-3', 'K-1']);
  });

  it('stacks the words so every one must match', () => {
    expect(keysShown(narrowedBy(BOARD, 'quiet k-2'))).toStrictEqual(['K-2']);
    expect(keysShown(narrowedBy(BOARD, 'quiet k-1'))).toStrictEqual([]);
  });
});

describe('what the sigils narrow the board to', () => {
  it('keeps one stage through the s sigil', () => {
    expect(keysShown(narrowedBy(BOARD, 's:designing'))).toStrictEqual(['K-1']);
  });

  it('answers a stage prefix as the stage', () => {
    expect(keysShown(narrowedBy(BOARD, 's:tri'))).toStrictEqual(['K-2', 'K-3']);
  });

  it('keeps one kind through the k sigil', () => {
    expect(keysShown(narrowedBy(BOARD, 'k:bug'))).toStrictEqual(['K-2']);
  });

  it('never answers a kind sigil with a card that has no kind', () => {
    expect(keysShown(narrowedBy(BOARD, 'k:feature'))).toStrictEqual(['K-1']);
    expect(keysShown(narrowedBy(BOARD, 'k:chore'))).toStrictEqual([]);
  });

  it('mixes sigils and words into one narrowing', () => {
    expect(keysShown(narrowedBy(BOARD, 's:triaged quiet'))).toStrictEqual(['K-2']);
  });
});
