import type { JourneyNode, Pieces, Visit } from './journey-node.ts';
import type { LoggedEvent } from './kanban.ts';

interface Writing {
  path: string;
  at: string | undefined;
}

function writtenPath(event: LoggedEvent, prefix: string): string | undefined {
  if (event.gate !== 'write' || event.outcome !== 'allowed') {
    return undefined;
  }

  return event.about?.startsWith(prefix) === true ? event.about : undefined;
}

function writingsAmong(events: LoggedEvent[], key: string): Writing[] {
  const prefix = `.ket/items/${key}/`;
  const written = events.flatMap((event) => {
    const path = writtenPath(event, prefix);

    return path === undefined ? [] : [{ path, at: event.at }];
  });
  const latest = new Map(written.map((writing) => [writing.path, writing.at]));

  return [...latest.entries()].map(([path, at]) => ({ path, at }));
}

interface DatedVisit {
  visit: Visit;
  at: string;
}

function datedAmong(stages: Visit[]): DatedVisit[] {
  return stages.flatMap((visit) => (visit.at === undefined ? [] : [{ visit, at: visit.at }]));
}

function lastOr(dated: DatedVisit[], fallback: Visit | undefined): Visit | undefined {
  return dated[dated.length - 1]?.visit ?? fallback;
}

function stageBefore(stages: Visit[], at: string | undefined): Visit | undefined {
  const dated = datedAmong(stages);

  if (at === undefined) {
    return lastOr(dated, stages[0]);
  }

  return lastOr(
    dated.filter((entry) => entry.at <= at),
    stages[0],
  );
}

function artifactNode(writing: Writing): JourneyNode {
  return {
    id: writing.path,
    kind: 'artifact',
    title: writing.path.split('/').pop() ?? writing.path,
    mark: 'done',
    at: writing.at,
    until: undefined,
    child: undefined,
    doc: undefined,
  };
}

export function artifactPieces(events: LoggedEvent[], key: string, stages: Visit[]): Pieces {
  const nodes: JourneyNode[] = [];
  const edges: [string, string][] = [];

  for (const writing of writingsAmong(events, key)) {
    const home = stageBefore(stages, writing.at);

    if (home === undefined) {
      continue;
    }

    nodes.push(artifactNode(writing));
    edges.push([home.id, writing.path]);

    const next = stages[stages.indexOf(home) + 1];

    if (next !== undefined) {
      edges.push([writing.path, next.id]);
    }
  }

  return { nodes, edges };
}
