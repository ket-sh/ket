import type { ItemStatus } from './item.ts';
import type { StoredItem } from './read-item.ts';

import { ITEM_STATUSES } from './item.ts';
import { parseItem } from './read-item.ts';

interface KanbanRefusal {
  reason: string;
  at: string;
}

interface KanbanCard {
  key: string;
  title: string;
  size: string;
  status: ItemStatus;
  since: string | undefined;
  refusal: KanbanRefusal | undefined;
}

export interface KanbanColumn {
  status: ItemStatus;
  cards: KanbanCard[];
}

interface LoggedEvent {
  outcome: string | undefined;
  gate: string | undefined;
  about: string | undefined;
  item: string;
  reason: string | undefined;
  at: string | undefined;
}

function wordAt(entry: object, field: string): string | undefined {
  const held: unknown = Reflect.get(entry, field);

  return typeof held === 'string' ? held : undefined;
}

function parsedOf(line: string): unknown {
  try {
    return JSON.parse(line);
  } catch {
    return undefined;
  }
}

function shapedEvent(parsed: object): LoggedEvent | undefined {
  const item = wordAt(parsed, 'item');

  if (item === undefined) {
    return undefined;
  }

  return {
    outcome: wordAt(parsed, 'outcome'),
    gate: wordAt(parsed, 'gate'),
    about: wordAt(parsed, 'about'),
    item,
    reason: wordAt(parsed, 'reason'),
    at: wordAt(parsed, 'at'),
  };
}

function eventOf(line: string): LoggedEvent | undefined {
  const parsed = parsedOf(line);

  return parsed !== null && typeof parsed === 'object' ? shapedEvent(parsed) : undefined;
}

function eventsAbout(log: string, key: string): LoggedEvent[] {
  return log
    .split('\n')
    .map((line) => eventOf(line))
    .filter((event): event is LoggedEvent => event !== undefined)
    .filter((event) => event.item === key);
}

function arrivalOf(events: LoggedEvent[], status: ItemStatus): string | undefined {
  return events
    .filter((event) => event.gate === 'transition' && event.outcome === 'allowed')
    .filter((event) => event.about === status)
    .at(-1)?.at;
}

function refusalAfter(events: LoggedEvent[], since: string): KanbanRefusal | undefined {
  const refused = events
    .filter((event) => event.outcome === 'refused')
    .filter((event) => event.at !== undefined && event.at >= since)
    .at(-1);

  if (refused?.at === undefined) {
    return undefined;
  }

  return { reason: refused.reason ?? refused.about ?? '', at: refused.at };
}

function cardOf(stored: StoredItem, log: string): KanbanCard | undefined {
  const item = parseItem(stored.contents);

  if (item === undefined) {
    return undefined;
  }

  const events = eventsAbout(log, stored.key);
  const since = arrivalOf(events, item.status);

  return {
    key: stored.key,
    title: item.title,
    size: item.size,
    status: item.status,
    since,
    refusal: since === undefined ? undefined : refusalAfter(events, since),
  };
}

export function foldKanban(stored: StoredItem[], log: string): KanbanColumn[] {
  const cards = stored
    .map((entry) => cardOf(entry, log))
    .filter((card): card is KanbanCard => card !== undefined);

  return ITEM_STATUSES.map((status) => ({
    status,
    cards: cards.filter((card) => card.status === status),
  }));
}
