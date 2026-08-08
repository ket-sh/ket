import type { Item } from '../../shared/item.ts';
import type { StoredItem } from '../../shared/read-item.ts';
import type { Reading, TimedEvent } from './timeline.ts';

import { isInFlight } from '../../shared/item.ts';
import { parseItem } from '../../shared/read-item.ts';
import { isMove } from './timeline.ts';

export interface ItemLine {
  key: string;
  title: string | undefined;
  size: string | undefined;
}

export interface FlightLine extends ItemLine {
  status: string;
  age: number | undefined;
}

export interface WeekInItems {
  entered: ItemLine[];
  shipped: ItemLine[];
  inFlight: FlightLine[];
  unmoved: ItemLine[];
}

export interface HeldItem {
  key: string;
  item: Item;
}

interface Arrival {
  key: string;
  at: number;
}

const FILED = 'triaged';

const SHIPPED = 'shipped';

export function heldBy(stored: StoredItem[]): HeldItem[] {
  return stored.flatMap((entry) => {
    const item = parseItem(entry.contents);

    return item === undefined ? [] : [{ key: entry.key, item }];
  });
}

function lineOf(key: string, held: HeldItem[]): ItemLine {
  const found = held.find((entry) => entry.key === key)?.item;

  return { key, title: found?.title, size: found?.size };
}

function arrivalsAt(events: TimedEvent[], status: string): Arrival[] {
  return events.flatMap((event) =>
    isMove(event) && event.about === status && event.item !== undefined
      ? [{ key: event.item, at: event.at }]
      : [],
  );
}

function keysOf(arrivals: Arrival[]): string[] {
  return [...new Set(arrivals.map((arrival) => arrival.key))];
}

function carriedOn(reading: Reading, filing: Arrival): boolean {
  return reading.windowed.some(
    (event) => isMove(event) && event.item === filing.key && event.at > filing.at,
  );
}

function openedAt(reading: Reading, key: string): number | undefined {
  return reading.timeline.find((event) => isMove(event) && event.item === key)?.at;
}

function flightLineOf(entry: HeldItem, reading: Reading): FlightLine {
  const opened = openedAt(reading, entry.key);

  return {
    key: entry.key,
    title: entry.item.title,
    size: entry.item.size,
    status: entry.item.status,
    age: opened === undefined ? undefined : reading.window.to - opened,
  };
}

export function weekInItems(reading: Reading): WeekInItems {
  const held = heldBy(reading.stored);
  const filings = arrivalsAt(reading.windowed, FILED);

  return {
    entered: keysOf(filings).map((key) => lineOf(key, held)),
    shipped: keysOf(arrivalsAt(reading.windowed, SHIPPED)).map((key) => lineOf(key, held)),
    inFlight: held
      .filter((entry) => isInFlight(entry.item.status))
      .map((entry) => flightLineOf(entry, reading)),
    unmoved: keysOf(filings.filter((filing) => !carriedOn(reading, filing))).map((key) =>
      lineOf(key, held),
    ),
  };
}
