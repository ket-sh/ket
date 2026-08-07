import type { Item, ItemStatus } from './item.ts';
import type { Journey, JourneyMark, JourneyNode, Pieces, Visit } from './journey-node.ts';
import type { LoggedEvent } from './kanban.ts';
import type { StoredItem } from './read-item.ts';

import { ITEM_STATUSES } from './item.ts';
import { artifactPieces } from './journey-artifacts.ts';
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

function visitsOf(events: LoggedEvent[]): Visit[] {
  const seen = new Map<string, number>();

  return movesAmong(events).map((move) => {
    const count = (seen.get(move.status) ?? 0) + 1;

    seen.set(move.status, count);

    return {
      id: count === 1 ? move.status : `${move.status}#${String(count)}`,
      status: move.status,
      at: move.at,
    };
  });
}

function pendingAfter(visits: Visit[]): Visit | undefined {
  const last = visits[visits.length - 1];

  if (last === undefined) {
    return undefined;
  }

  const next = ITEM_STATUSES[ITEM_STATUSES.indexOf(last.status) + 1];

  if (next === undefined) {
    return undefined;
  }

  const held = visits.filter((visit) => visit.status === next).length;

  return {
    id: held === 0 ? next : `${next}#${String(held + 1)}`,
    status: next,
    at: undefined,
  };
}

function stageNode(visit: Visit, mark: JourneyMark): JourneyNode {
  return {
    id: visit.id,
    kind: 'stage',
    title: visit.status,
    mark,
    at: visit.at,
    child: undefined,
    doc: undefined,
  };
}

function stageNodes(visits: Visit[], pending: Visit | undefined): JourneyNode[] {
  const walked = visits.map((visit, index) =>
    stageNode(visit, index === visits.length - 1 ? 'active' : 'done'),
  );

  return pending === undefined ? walked : [...walked, stageNode(pending, 'pending')];
}

function stageEdges(stages: Visit[]): [string, string][] {
  return stages.flatMap((stage, index) => {
    const follower = stages[index + 1];

    return follower === undefined ? [] : [[stage.id, follower.id] satisfies [string, string]];
  });
}

function childMark(status: ItemStatus): JourneyMark {
  if (status === 'shipped') {
    return 'done';
  }

  return status === 'idea' ? 'pending' : 'active';
}

function childNode(stored: StoredItem[], log: string, key: string): JourneyNode {
  const entry = stored.find((candidate) => candidate.key === key);
  const item = entry === undefined ? undefined : parseItem(entry.contents);

  if (item === undefined) {
    return {
      id: key,
      kind: 'child',
      title: key,
      mark: 'pending',
      at: undefined,
      child: key,
      doc: undefined,
    };
  }

  return {
    id: key,
    kind: 'child',
    title: `${key} ${item.title}`,
    mark: childMark(item.status),
    at: arrivalOf(eventsAbout(log, key), item.status),
    child: key,
    doc: undefined,
  };
}

function childPieces(
  children: string[],
  stored: StoredItem[],
  log: string,
  anchor: string,
): Pieces {
  const nodes = children.map((child) => childNode(stored, log, child));

  return { nodes, edges: nodes.map((node) => [anchor, node.id]) };
}

interface Walk {
  visits: Visit[];
  pending: Visit | undefined;
  stages: Visit[];
}

function walkOf(events: LoggedEvent[], fallback: ItemStatus): Walk {
  const walked = visitsOf(events);

  if (walked.length === 0) {
    const alone = [{ id: fallback, status: fallback, at: undefined }];

    return { visits: alone, pending: undefined, stages: alone };
  }

  const pending = pendingAfter(walked);

  return {
    visits: walked,
    pending,
    stages: pending === undefined ? walked : [...walked, pending],
  };
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
  const artifacts = artifactPieces(events, key, walk.stages);
  const anchor = walk.visits[walk.visits.length - 1];
  const kin = childPieces(item.children, stored, log, anchor?.id ?? item.status);

  return {
    item: key,
    title: item.title,
    nodes: [...stageNodes(walk.visits, walk.pending), ...artifacts.nodes, ...kin.nodes],
    edges: [...stageEdges(walk.stages), ...artifacts.edges, ...kin.edges],
    standing: standingOf(events, anchor?.at),
  };
}
