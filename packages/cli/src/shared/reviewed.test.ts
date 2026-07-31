import { describe, expect, it } from 'vitest';

import { reviewedIn } from './reviewed.ts';

const RAN = '{"gate":"review","outcome":"allowed","about":"OS-1","item":"OS-1"}';

const SKIPPED =
  '{"gate":"review","outcome":"skipped","about":"OS-2","item":"OS-2","reason":"a typo fix"}';

const OTHER = '{"gate":"write","outcome":"allowed","about":"src/a.ts","item":"OS-3"}';

describe('which items a review has already answered for', () => {
  it('names an item whose review ran', () => {
    expect(reviewedIn(`${RAN}\n`)).toStrictEqual(['OS-1']);
  });

  it('names an item whose review was skipped on purpose, since the skip is the answer', () => {
    expect(reviewedIn(`${SKIPPED}\n`)).toStrictEqual(['OS-2']);
  });

  it('names neither for a log holding no review at all', () => {
    expect(reviewedIn(`${OTHER}\n`)).toStrictEqual([]);
  });

  it('names each item once, however many times it was reviewed', () => {
    expect(reviewedIn(`${RAN}\n${RAN}\n`)).toStrictEqual(['OS-1']);
  });

  it('names them in key order, so the answer does not move', () => {
    expect(reviewedIn(`${SKIPPED}\n${RAN}\n`)).toStrictEqual(['OS-1', 'OS-2']);
  });

  it('reads nothing from an empty log', () => {
    expect(reviewedIn('')).toStrictEqual([]);
  });

  it('skips a line it cannot read rather than giving up on the rest', () => {
    expect(reviewedIn(`nonsense\n${RAN}\n`)).toStrictEqual(['OS-1']);
  });

  it('skips a review that names no item, since it answers for nothing', () => {
    expect(reviewedIn(`{"gate":"review","outcome":"allowed","about":"x"}\n${RAN}\n`)).toStrictEqual(
      ['OS-1'],
    );
  });
});

describe('a log line that is not a review of an item', () => {
  it('reads nothing from a review whose item never closes its quotes', () => {
    expect(reviewedIn('{"gate":"review","item":"OS-1\n')).toStrictEqual([]);
  });

  it('reads nothing from a review naming an empty item', () => {
    expect(reviewedIn('{"gate":"review","outcome":"allowed","item":""}\n')).toStrictEqual([]);
  });
});
