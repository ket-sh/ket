import type { Item, ItemStatus } from './item.ts';
import type { StoredItem } from './read-item.ts';

import { ITEM_STATUSES } from './item.ts';
import { parseItem } from './read-item.ts';

interface BoardEntry {
  key: string;
  item: Item;
}

const EMPTY = 'No items yet. Run /ket:feature to file the first one.';

function readable(stored: StoredItem[]): BoardEntry[] {
  return stored
    .map((each) => ({ key: each.key, item: parseItem(each.contents) }))
    .filter((entry): entry is BoardEntry => entry.item !== undefined)
    .toSorted((left, right) => left.key.localeCompare(right.key));
}

function under(entry: BoardEntry): string {
  const parent = entry.item.parent === undefined ? '' : ` (under ${entry.item.parent})`;

  return `- **${entry.key}** ${entry.item.title} \`${entry.item.size}\`${parent}`;
}

function held(entries: BoardEntry[], status: ItemStatus): string[] {
  const holding = entries.filter((entry) => entry.item.status === status);

  return holding.length === 0 ? [] : [`## ${status}`, '', ...holding.map(under), ''];
}

export function renderBoard(key: string, stored: StoredItem[]): string {
  const entries = readable(stored);
  const grouped = ITEM_STATUSES.flatMap((status) => held(entries, status));
  const body = grouped.length === 0 ? [EMPTY, ''] : grouped;

  return [`# ${key} board`, '', ...body].join('\n');
}
