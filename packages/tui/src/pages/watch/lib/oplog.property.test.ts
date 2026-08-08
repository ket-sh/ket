import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import type { OplogEventView } from '../../../shared/model';

import { narrowedEvents } from './oplog.ts';

const someRow = fc.record<OplogEventView>({
  outcome: fc.option(fc.constantFrom('allowed', 'refused', 'skipped'), { nil: undefined }),
  gate: fc.option(fc.constantFrom('write', 'probe', 'transition', 'lint'), { nil: undefined }),
  about: fc.option(fc.constantFrom('designing', 'src/keeper.ts', 'bun run lint'), {
    nil: undefined,
  }),
  item: fc.option(fc.constantFrom('K-1', 'K-2', 'K-11'), { nil: undefined }),
  reason: fc.option(fc.constantFrom('no failing test covers it'), { nil: undefined }),
  at: fc.constant(undefined),
  note: fc.option(fc.constantFrom('researching the breakdown'), { nil: undefined }),
  actor: fc.option(fc.constantFrom('decomposer'), { nil: undefined }),
});

const someQuery = fc
  .array(fc.constantFrom('covers', 'k-1', 'DESIGNING', 'g:tr', 'g:note', 'o:r', 'i:k-1', 'i:'), {
    maxLength: 3,
  })
  .map((tokens) => tokens.join(' '));

function subsequenceOf(kept: OplogEventView[], whole: OplogEventView[]): boolean {
  let at = 0;

  for (const row of kept) {
    at = whole.indexOf(row, at);

    if (at < 0) {
      return false;
    }

    at += 1;
  }

  return true;
}

function neverInventsOrReorders(rows: OplogEventView[], query: string): void {
  expect(subsequenceOf(narrowedEvents(rows, query), rows)).toBe(true);
}

describe('the invariant a narrowing keeps', () => {
  it('never invents or reorders a row, whatever the query', () => {
    fc.assert(fc.property(fc.array(someRow, { maxLength: 8 }), someQuery, neverInventsOrReorders));
  });
});
