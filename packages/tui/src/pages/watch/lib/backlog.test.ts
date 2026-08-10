import { describe, expect, it } from 'vitest';

import type { KanbanCardView, KanbanColumnView } from '../../../shared/model';

import { backlogLeftOf, backlogOf } from './backlog.ts';

function cardOf(key: string, status: string, parent?: string): KanbanCardView {
  return {
    key,
    title: `the ${key} thing`,
    size: 'story',
    status,
    parent,
    since: undefined,
    refusal: undefined,
    note: undefined,
    offers: [],
  };
}

function boardOf(cards: KanbanCardView[]): KanbanColumnView[] {
  const stages = [
    'idea',
    'triaged',
    'designing',
    'awaiting-approval',
    'implementing',
    'verifying',
    'awaiting-merge',
    'shipped',
  ];

  return stages.map((status) => ({
    status,
    cards: cards.filter((card) => card.status === status),
  }));
}

function keysIn(cards: KanbanCardView[]): string[] {
  return cards.map((card) => card.key);
}

describe('what the backlog holds', () => {
  it('holds the items nothing has started yet', () => {
    const board = boardOf([cardOf('K-1', 'idea'), cardOf('K-2', 'triaged')]);

    expect(keysIn(backlogOf(board))).toStrictEqual(['K-2', 'K-1']);
  });

  it('leaves every item already in the active flow to the board', () => {
    const board = boardOf([
      cardOf('K-3', 'designing'),
      cardOf('K-4', 'implementing'),
      cardOf('K-5', 'awaiting-merge'),
    ]);

    expect(backlogOf(board)).toStrictEqual([]);
  });

  it('leaves a shipped item out, since nothing is waiting on it', () => {
    expect(backlogOf(boardOf([cardOf('K-6', 'shipped')]))).toStrictEqual([]);
  });

  it('holds a queued epic child beside the items filed on their own', () => {
    const board = boardOf([cardOf('K-1', 'triaged'), cardOf('K-2', 'triaged', 'K-9')]);

    expect(keysIn(backlogOf(board))).toStrictEqual(['K-1', 'K-2']);
  });
});

describe('the order the backlog reads in', () => {
  it('puts the triaged items above the ideas, nearest to starting first', () => {
    const board = boardOf([
      cardOf('K-1', 'idea'),
      cardOf('K-2', 'triaged'),
      cardOf('K-3', 'idea'),
      cardOf('K-4', 'triaged'),
    ]);

    expect(keysIn(backlogOf(board))).toStrictEqual(['K-2', 'K-4', 'K-1', 'K-3']);
  });

  it('reads an empty board as an empty backlog', () => {
    expect(backlogOf(boardOf([]))).toStrictEqual([]);
  });
});

describe('how much backlog is left below the cursor', () => {
  const board = boardOf([
    cardOf('K-1', 'idea'),
    cardOf('K-2', 'triaged'),
    cardOf('K-3', 'triaged'),
  ]);

  it('counts the rows still standing below the chosen one', () => {
    expect(backlogLeftOf(board, 'K-2')).toBe(2);
  });

  it('reads the last row as having nothing below it', () => {
    expect(backlogLeftOf(board, 'K-1')).toBe(0);
  });

  it('reads a cursor resting on no backlog row as having nothing below it', () => {
    expect(backlogLeftOf(board, 'K-9')).toBe(0);
  });

  it('reads an empty backlog as having nothing below it', () => {
    expect(backlogLeftOf(boardOf([]), undefined)).toBe(0);
  });
});
