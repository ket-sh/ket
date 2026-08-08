import type { StoredItem } from '../../shared/read-item.ts';
import type { RetroWindow } from './window.ts';

import { readEvents } from '../../shared/log-lines.ts';
import { momentOf } from './window.ts';

export interface TimedEvent {
  outcome: string | undefined;
  gate: string | undefined;
  about: string | undefined;
  item: string | undefined;
  reason: string | undefined;
  at: number;
}

export interface Reading {
  stored: StoredItem[];
  timeline: TimedEvent[];
  windowed: TimedEvent[];
  window: RetroWindow;
}

export interface Gap {
  opened: number;
  span: number;
}

const MOVE_GATE = 'transition';

const ALLOWED = 'allowed';

const REFUSED = 'refused';

export function isMove(event: TimedEvent): boolean {
  return event.gate === MOVE_GATE && event.outcome === ALLOWED;
}

export function isRefusal(event: TimedEvent): boolean {
  return event.outcome === REFUSED;
}

export function isWithin(event: TimedEvent, window: RetroWindow): boolean {
  return event.at >= window.from && event.at <= window.to;
}

export function eventsOn(events: TimedEvent[], key: string): TimedEvent[] {
  return events.filter((event) => event.item === key);
}

export function gapsAmong(events: TimedEvent[]): Gap[] {
  return events.flatMap((event, index) => {
    const next = events[index + 1];

    return next === undefined ? [] : [{ opened: event.at, span: next.at - event.at }];
  });
}

export function stageAt(reading: Reading, key: string, moment: number, standing: string): string {
  const arrived = eventsOn(reading.timeline, key)
    .filter((event) => isMove(event) && event.at <= moment)
    .at(-1);

  return arrived?.about ?? standing;
}

function timedOf(at: string | undefined): number | undefined {
  return at === undefined ? undefined : momentOf(at);
}

function timelineOf(log: string): TimedEvent[] {
  return readEvents(log)
    .flatMap((event) => {
      const at = timedOf(event.at);

      return at === undefined ? [] : [{ ...event, at }];
    })
    .sort((one, next) => one.at - next.at);
}

export function readingOf(stored: StoredItem[], log: string, window: RetroWindow): Reading {
  const timeline = timelineOf(log);

  return {
    stored,
    timeline,
    windowed: timeline.filter((event) => isWithin(event, window)),
    window,
  };
}
