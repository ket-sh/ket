import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import type { Journey } from './journey.ts';
import type { StoredItem } from './read-item.ts';

import { ITEM_STATUSES } from './item.ts';
import { foldJourney } from './journey.ts';

const KEY = 'K-1';

const someStored = fc.constantFrom(...ITEM_STATUSES).map((status) => [
  {
    key: KEY,
    contents: `title: Item under test\nkind: feature\nsize: story\nstatus: ${status}\nchildren: []\n`,
  },
]);

const someMoment = fc
  .integer({ min: 0, max: 9999 })
  .map((tick) => `2026-08-07T00:00:00.${String(tick).padStart(4, '0')}Z`);

const someMove = fc.record({ to: fc.constantFrom(...ITEM_STATUSES), at: someMoment }).map((move) =>
  JSON.stringify({
    gate: 'transition',
    outcome: 'allowed',
    about: move.to,
    item: KEY,
    at: move.at,
  }),
);

const someWrite = fc
  .record({
    path: fc.oneof(
      fc.constantFrom(`.ket/items/${KEY}/spec.md`, `.ket/items/${KEY}/adr.md`, 'src/auth.ts'),
      fc.string(),
    ),
    at: someMoment,
  })
  .map((write) =>
    JSON.stringify({
      gate: 'write',
      outcome: 'allowed',
      about: write.path,
      item: KEY,
      at: write.at,
    }),
  );

const someLog = fc
  .array(fc.oneof(someMove, someWrite, fc.string(), fc.json()), { maxLength: 24 })
  .map((lines) => lines.join('\n'));

function nodeIds(stored: StoredItem[], log: string): string[] {
  return foldJourney(stored, log, KEY)?.nodes.map((node) => node.id) ?? [];
}

function edgesOf(stored: StoredItem[], log: string): [string, string][] {
  return foldJourney(stored, log, KEY)?.edges ?? [];
}

function visitedStages(stored: StoredItem[], log: string): Journey['nodes'] {
  return (foldJourney(stored, log, KEY)?.nodes ?? []).filter(
    (node) => node.kind === 'stage' && node.at !== undefined,
  );
}

describe('the invariants a journey keeps', () => {
  it('names every edge endpoint after an existing node, whatever the log carries', () => {
    fc.assert(
      fc.property(someStored, someLog, (stored, log) => {
        const ids = new Set(nodeIds(stored, log));

        for (const [from, to] of edgesOf(stored, log)) {
          expect(ids.has(from)).toBe(true);
          expect(ids.has(to)).toBe(true);
        }
      }),
    );
  });

  it('never lets two nodes share an id, whatever the log carries', () => {
    fc.assert(
      fc.property(someStored, someLog, (stored, log) => {
        const ids = nodeIds(stored, log);

        expect(new Set(ids).size).toBe(ids.length);
      }),
    );
  });

  it('closes each visited stage where the next one opens, leaving only the last open', () => {
    fc.assert(
      fc.property(someStored, someLog, (stored, log) => {
        const visited = visitedStages(stored, log);

        for (const [index, stage] of visited.entries()) {
          expect(stage.until).toBe(visited[index + 1]?.at);
        }
      }),
    );
  });
});
