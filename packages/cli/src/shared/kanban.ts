import type { ItemKind, ItemStatus } from './item.ts';
import type { StoredItem } from './read-item.ts';
import type { GateAction } from './transition.ts';

import { ITEM_STATUSES } from './item.ts';
import { readEvents } from './log-lines.ts';
import { parseItem } from './read-item.ts';
import { offeredBy } from './transition.ts';

export interface KanbanRefusal {
  reason: string;
  at: string;
  gate: string;
}

export interface ItemNote {
  text: string;
  actor: string;
  at: string;
}

interface KanbanCard {
  key: string;
  title: string;
  size: string;
  kind: ItemKind;
  status: ItemStatus;
  parent: string | undefined;
  since: string | undefined;
  refusal: KanbanRefusal | undefined;
  note: ItemNote | undefined;
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
  note: string | undefined;
  actor: string | undefined;
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

function refusalOf(event: LoggedEvent): KanbanRefusal | undefined {
  return event.at === undefined
    ? undefined
    : { reason: event.reason ?? event.about ?? '', at: event.at, gate: event.gate ?? '' };
}

export function refusalAfter(events: LoggedEvent[], since: string): KanbanRefusal | undefined {
  const refused = events
    .filter((event) => event.outcome === 'refused')
    .filter((event) => event.at !== undefined && event.at >= since)
    .at(-1);

  return refused === undefined ? undefined : refusalOf(refused);
}

function noteOf(event: LoggedEvent): ItemNote | undefined {
  if (event.note === undefined || event.actor === undefined || event.at === undefined) {
    return undefined;
  }

  return { text: event.note, actor: event.actor, at: event.at };
}

export function noteAfter(events: LoggedEvent[], since: string): ItemNote | undefined {
  return events
    .flatMap((event) => {
      const note = noteOf(event);

      return note === undefined ? [] : [note];
    })
    .filter((note) => note.at >= since)
    .at(-1);
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
    kind: item.kind,
    status: item.status,
    parent: item.parent,
    since,
    refusal: since === undefined ? undefined : refusalAfter(events, since),
    note: since === undefined ? undefined : noteAfter(events, since),
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
