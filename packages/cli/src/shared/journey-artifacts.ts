import type { JourneyArtifact, JourneyStep, Visit } from './journey-node.ts';
import type { LoggedEvent } from './kanban.ts';

function writtenPath(event: LoggedEvent, prefix: string): string | undefined {
  if (event.gate !== 'write' || event.outcome !== 'allowed') {
    return undefined;
  }

  return event.about?.startsWith(prefix) === true ? event.about : undefined;
}

function writesAmong(events: LoggedEvent[], key: string): [string, string | undefined][] {
  const prefix = `.ket/items/${key}/`;

  return events.flatMap((event) => {
    const path = writtenPath(event, prefix);

    return path === undefined ? [] : [[path, event.at] satisfies [string, string | undefined]];
  });
}

export function artifactsOf(events: LoggedEvent[], key: string): JourneyArtifact[] {
  return [...new Map(writesAmong(events, key)).entries()].map(([path, at]) => ({
    path,
    name: path.split('/').pop() ?? path,
    at,
    doc: undefined,
  }));
}

function opened(visit: Visit, at: string | undefined): boolean {
  return visit.at === undefined || (at !== undefined && at >= visit.at);
}

function unclosed(visit: Visit, at: string | undefined): boolean {
  return visit.until === undefined || (at !== undefined && at < visit.until);
}

export function stepsOf(events: LoggedEvent[], key: string, visit: Visit): JourneyStep[] {
  const held = writesAmong(events, key).filter(
    ([, at]) => opened(visit, at) && unclosed(visit, at),
  );

  return [...new Map(held).entries()].map(([path, at]) => ({
    name: path.split('/').pop() ?? path,
    at,
  }));
}
