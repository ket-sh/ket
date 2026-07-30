import type { Item, ItemKind, ItemSize, ItemStatus } from './item.ts';
import type { GovernedItem } from './write-gate.ts';

import { isInFlight, ITEM_KINDS, ITEM_SIZES, ITEM_STATUSES } from './item.ts';

const STATUSES: ItemStatus[] = [...ITEM_STATUSES];

const KINDS: ItemKind[] = [...ITEM_KINDS];

const SIZES: ItemSize[] = [...ITEM_SIZES];

const CHILD_MARKER = '- ';

export interface StoredItem {
  key: string;
  contents: string;
}

const SEPARATOR = ': ';

function valueOf(contents: string, field: string): string | undefined {
  const opening = `${field}${SEPARATOR}`;
  const line = contents.split('\n').find((candidate) => candidate.startsWith(opening));

  return line?.slice(opening.length);
}

function childrenOf(contents: string): string[] {
  return contents
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith(CHILD_MARKER))
    .map((line) => line.slice(CHILD_MARKER.length));
}

function oneOf<Known extends string>(known: Known[], value: string | undefined): Known | undefined {
  return known.find((candidate) => candidate === value);
}

export function parseItem(contents: string): Item | undefined {
  const title = valueOf(contents, 'title');
  const kind = oneOf(KINDS, valueOf(contents, 'kind'));
  const size = oneOf(SIZES, valueOf(contents, 'size'));
  const status = oneOf(STATUSES, valueOf(contents, 'status'));

  if (title === undefined || kind === undefined || size === undefined || status === undefined) {
    return undefined;
  }

  return { title, kind, size, status, children: childrenOf(contents) };
}

function governed(stored: StoredItem): GovernedItem | undefined {
  const item = parseItem(stored.contents);

  if (item === undefined || !isInFlight(item.status)) {
    return undefined;
  }

  return { key: stored.key, kind: item.kind, size: item.size, status: item.status };
}

export function inFlightFrom(stored: StoredItem[]): GovernedItem[] {
  return stored
    .map((entry) => governed(entry))
    .filter((item): item is GovernedItem => item !== undefined);
}
