import type { ItemStatus } from './item.ts';
import type { StoredItem } from './read-item.ts';
import type { GateAction } from './transition.ts';

import { ITEM_STATUSES } from './item.ts';
import { readEvents } from './log-lines.ts';
import { parseItem } from './read-item.ts';
import { offeredBy } from './transition.ts';

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
  offers: GateAction[];
}

export interface KanbanColumn {
  status: ItemStatus;
  cards: KanbanCard[];
}

export interface LoggedEvent {
  outcome: string | undefined;
  gate: string | undefined;
  about: string | undefined;
  item: string;
  reason: string | undefined;
  at: string | undefined;
}

export function eventsAbout(log: string, key: string): LoggedEvent[] {
  return readEvents(log).flatMap((event) => (event.item === key ? [{ ...event, item: key }] : []));
}

export function arrivalOf(events: LoggedEvent[], status: ItemStatus): string | undefined {
  return events
    .filter((event) => event.gate === 'transition' && event.outcome === 'allowed')
    .filter((event) => event.about === status)
    .at(-1)?.at;
}

export function refusalAfter(events: LoggedEvent[], since: string): KanbanRefusal | undefined {
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
    offers: offeredBy(item),
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
