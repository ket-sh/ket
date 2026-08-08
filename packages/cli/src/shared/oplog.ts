import type { LoggedEvent } from './log-lines.ts';

import { readEvents } from './log-lines.ts';

const OPLOG_SPAN = 500;

function namesAnOperation(event: LoggedEvent): boolean {
  return event.gate !== undefined || event.note !== undefined;
}

export function foldOplog(log: string): LoggedEvent[] {
  return readEvents(log).filter(namesAnOperation).slice(-OPLOG_SPAN).toReversed();
}
