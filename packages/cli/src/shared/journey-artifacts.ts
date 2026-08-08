import type { JourneyArtifact } from './journey-node.ts';
import type { LoggedEvent } from './kanban.ts';

function writtenPath(event: LoggedEvent, prefix: string): string | undefined {
  if (event.gate !== 'write' || event.outcome !== 'allowed') {
    return undefined;
  }

  return event.about?.startsWith(prefix) === true ? event.about : undefined;
}

export function artifactsOf(events: LoggedEvent[], key: string): JourneyArtifact[] {
  const prefix = `.ket/items/${key}/`;
  const written = events.flatMap((event) => {
    const path = writtenPath(event, prefix);

    return path === undefined ? [] : [[path, event.at] satisfies [string, string | undefined]];
  });

  return [...new Map(written).entries()].map(([path, at]) => ({
    path,
    name: path.split('/').pop() ?? path,
    at,
    doc: undefined,
  }));
}
