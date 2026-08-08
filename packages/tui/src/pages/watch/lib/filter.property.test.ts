import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import type { KanbanCardView, KanbanColumnView } from '../../../shared/model';

import { narrowedBy } from './filter.ts';

const someCard = fc.record({
  key: fc.constantFrom('K-1', 'K-2', 'K-3', 'K-4'),
  title: fc.constantFrom('A quiet fix', 'The watched item', 'Pay by card'),
  size: fc.constant('story'),
  status: fc.constantFrom('idea', 'triaged', 'designing'),
  kind: fc.option(fc.constantFrom('feature', 'bug', 'chore'), { nil: undefined }),
  parent: fc.constant(undefined),
  since: fc.constant(undefined),
  refusal: fc.constant(undefined),
  note: fc.constant(undefined),
  offers: fc.constant<KanbanCardView['offers']>([]),
});

const someBoard = fc.array(someCard, { maxLength: 8 }).map((cards): KanbanColumnView[] =>
  ['idea', 'triaged', 'designing'].map((status) => ({
    status,
    cards: cards.filter((card) => card.status === status),
  })),
);

const someQuery = fc
  .array(fc.constantFrom('quiet', 'k-1', 'watched', 's:tri', 's:designing', 'k:bug', 'k:chore'), {
    maxLength: 3,
  })
  .map((tokens) => tokens.join(' '));

function subsequenceOf(kept: string[], whole: string[]): boolean {
  let at = 0;

  for (const key of kept) {
    at = whole.indexOf(key, at);

    if (at < 0) {
      return false;
    }

    at += 1;
  }

  return true;
}

function statusesOf(columns: KanbanColumnView[]): string[] {
  return columns.map((column) => column.status);
}

function keysOf(column: KanbanColumnView | undefined): string[] {
  return column === undefined ? [] : column.cards.map((card) => card.key);
}

function neverInventsReordersOrRestages(board: KanbanColumnView[], query: string): void {
  const narrowed = narrowedBy(board, query);

  expect(statusesOf(narrowed)).toStrictEqual(statusesOf(board));

  for (const [at, column] of narrowed.entries()) {
    expect(subsequenceOf(keysOf(column), keysOf(board[at]))).toBe(true);
  }
}

describe('the invariant a narrowing keeps', () => {
  it('never invents, reorders, or restages a card, whatever the query', () => {
    fc.assert(fc.property(someBoard, someQuery, neverInventsReordersOrRestages));
  });
});
