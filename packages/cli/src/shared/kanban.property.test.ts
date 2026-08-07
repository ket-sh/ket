import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import type { StoredItem } from './read-item.ts';

import { ITEM_STATUSES } from './item.ts';
import { foldKanban } from './kanban.ts';

const someKeys = fc.uniqueArray(fc.stringMatching(/^K-[1-9][0-9]?$/), { maxLength: 8 });

const someStored = someKeys.map((keys) =>
  keys.map((key, index) => ({
    key,
    contents: `title: Item ${key}\nkind: feature\nsize: story\nstatus: ${
      ITEM_STATUSES[index % ITEM_STATUSES.length] ?? 'triaged'
    }\n`,
  })),
);

const someLog = fc
  .array(fc.oneof(fc.string(), fc.json()), { maxLength: 20 })
  .map((lines) => lines.join('\n'));

function seatedKeys(stored: StoredItem[], log: string): string[] {
  return foldKanban(stored, log)
    .flatMap((column) => column.cards)
    .map((card) => card.key)
    .sort();
}

function storedKeys(stored: StoredItem[]): string[] {
  return stored.map((entry) => entry.key).sort();
}

function columnStatuses(stored: StoredItem[], log: string): string[] {
  return foldKanban(stored, log).map((column) => column.status);
}

describe('the invariants a fold keeps', () => {
  it('seats every readable item exactly once, whatever the log says', () => {
    fc.assert(
      fc.property(someStored, someLog, (stored, log) => {
        expect(seatedKeys(stored, log)).toStrictEqual(storedKeys(stored));
      }),
    );
  });

  it('shows the same columns in the same order, whatever arrives', () => {
    fc.assert(
      fc.property(someStored, someLog, (stored, log) => {
        expect(columnStatuses(stored, log)).toStrictEqual([...ITEM_STATUSES]);
      }),
    );
  });
});
