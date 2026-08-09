import type { LoggedEvent } from '../../../shared/log-lines.ts';

function carriesOut(event: LoggedEvent, key: string, from: string): boolean {
  return (
    event.gate === 'transition' &&
    event.outcome === 'allowed' &&
    event.item === key &&
    event.about !== undefined &&
    event.about !== from
  );
}

export function departureAmong(
  events: LoggedEvent[],
  key: string,
  from: string,
): string | undefined {
  return events.find((event) => carriesOut(event, key, from))?.about;
}
