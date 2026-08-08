import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { siftedBy } from './palette.ts';

const someEntries = fc.array(
  fc.record({
    label: fc.constantFrom(
      'board',
      'backlog',
      'map',
      'K-1  The watched item',
      'K-2  A quiet fix',
      'approve K-2',
      'refresh',
      'themes',
    ),
  }),
  { maxLength: 10 },
);

const someQuery = fc.string({ maxLength: 4, unit: fc.constantFrom('a', 'b', 'k', '1', '-', ' ') });

function threads(label: string, query: string): boolean {
  let at = 0;

  for (const glyph of query.toLowerCase()) {
    at = label.toLowerCase().indexOf(glyph, at);

    if (at < 0) {
      return false;
    }

    at += 1;
  }

  return true;
}

function exactlyTheThreadedLabels(entries: { label: string }[], query: string): void {
  const sifted = siftedBy(entries, query);
  const wanted = entries.filter((entry) => threads(entry.label, query.trim()));

  expect(sifted.map((entry) => entry.label).toSorted()).toStrictEqual(
    wanted.map((entry) => entry.label).toSorted(),
  );
}

describe('the invariant the sifting keeps', () => {
  it('answers with exactly the threaded labels, never inventing one', () => {
    fc.assert(fc.property(someEntries, someQuery, exactlyTheThreadedLabels));
  });
});
