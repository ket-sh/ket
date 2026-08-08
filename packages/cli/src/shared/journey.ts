import type { Item, ItemStatus } from './item.ts';
import type { Journey, JourneyChild, JourneyMark, JourneyNode, Visit } from './journey-node.ts';
import type { LoggedEvent } from './kanban.ts';
import type { StoredItem } from './read-item.ts';

import { ITEM_STATUSES } from './item.ts';
import { artifactsOf } from './journey-artifacts.ts';
import { arrivalOf, eventsAbout, refusalAfter } from './kanban.ts';
import { parseItem } from './read-item.ts';

export type { Journey } from './journey-node.ts';
export type { SurfaceDoc } from './surface-doc.ts';

function statusOf(about: string | undefined): ItemStatus | undefined {
  return ITEM_STATUSES.find((status) => status === about);
}

function movesAmong(events: LoggedEvent[]): { status: ItemStatus; at: string | undefined }[] {
  return events
    .filter((event) => event.gate === 'transition' && event.outcome === 'allowed')
    .flatMap((event) => {
      const status = statusOf(event.about);

      return status === undefined ? [] : [{ status, at: event.at }];
    });
}

function idFor(status: ItemStatus, held: number): string {
  return held === 0 ? status : `${status}#${String(held + 1)}`;
}

function visitsOf(events: LoggedEvent[]): Visit[] {
  const seen = new Map<string, number>();
  const moves = movesAmong(events);

  return moves.map((move, index) => {
    const count = (seen.get(move.status) ?? 0) + 1;

    seen.set(move.status, count);

    return {
      id: idFor(move.status, count - 1),
      status: move.status,
      at: move.at,
      until: moves[index + 1]?.at,
    };
  });
}

// The machine's declared order is the whole path, so a status added to the
// lifecycle joins the canvas without a second edit here.
function aheadOf(visits: Visit[], standing: ItemStatus): Visit[] {
  const reached = ITEM_STATUSES.indexOf(standing);

  return ITEM_STATUSES.slice(reached + 1).map((status) => ({
    id: idFor(status, visits.filter((visit) => visit.status === status).length),
    status,
    at: undefined,
    until: undefined,
  }));
}

function stageNode(visit: Visit, mark: JourneyMark): JourneyNode {
  return {
    id: visit.id,
    title: visit.status,
    mark,
    at: visit.at,
    until: visit.until,
    doc: undefined,
  };
}

function stageEdges(stages: Visit[]): [string, string][] {
  return stages.flatMap((stage, index) => {
    const follower = stages[index + 1];

    return follower === undefined ? [] : [[stage.id, follower.id] satisfies [string, string]];
  });
}

function childOf(stored: StoredItem[], log: string, key: string): JourneyChild | undefined {
  const entry = stored.find((candidate) => candidate.key === key);
  const item = entry === undefined ? undefined : parseItem(entry.contents);

  if (item === undefined) {
    return undefined;
  }

  const events = eventsAbout(log, key);
  const since = arrivalOf(events, item.status);

  return {
    key,
    title: item.title,
    size: item.size,
    status: item.status,
    since,
    refusal: since === undefined ? undefined : refusalAfter(events, since),
  };
}

function childrenOf(stored: StoredItem[], log: string, keys: string[]): JourneyChild[] {
  return keys.flatMap((key) => {
    const child = childOf(stored, log, key);

    return child === undefined ? [] : [child];
  });
}

interface Walk {
  visited: Visit[];
  ahead: Visit[];
}

function walkOf(events: LoggedEvent[], standing: ItemStatus): Walk {
  const visited = visitsOf(events);
  const last = visited[visited.length - 1];

  if (last === undefined) {
    const alone = { id: standing, status: standing, at: undefined, until: undefined };

    return { visited: [alone], ahead: aheadOf([], standing) };
  }

  return { visited, ahead: aheadOf(visited, last.status) };
}

function stageNodes(walk: Walk): JourneyNode[] {
  const walked = walk.visited.map((visit, index) =>
    stageNode(visit, index === walk.visited.length - 1 ? 'active' : 'done'),
  );

  return [...walked, ...walk.ahead.map((visit) => stageNode(visit, 'future'))];
}

function itemAt(stored: StoredItem[], key: string): Item | undefined {
  const entry = stored.find((candidate) => candidate.key === key);

  return entry === undefined ? undefined : parseItem(entry.contents);
}

function standingOf(events: LoggedEvent[], since: string | undefined): string | undefined {
  return since === undefined ? undefined : refusalAfter(events, since)?.reason;
}

export function foldJourney(stored: StoredItem[], log: string, key: string): Journey | undefined {
  const item = itemAt(stored, key);

  if (item === undefined) {
    return undefined;
  }

  const events = eventsAbout(log, key);
  const walk = walkOf(events, item.status);

  return {
    item: key,
    title: item.title,
    nodes: stageNodes(walk),
    edges: stageEdges([...walk.visited, ...walk.ahead]),
    standing: standingOf(events, walk.visited.at(-1)?.at),
    artifacts: artifactsOf(events, key),
    children: childrenOf(stored, log, item.children),
  };
}
