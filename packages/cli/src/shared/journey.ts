import type { Item, ItemStatus } from './item.ts';
import type { Journey, JourneyChild, JourneyNode, StageState, Visit } from './journey-node.ts';
import type { KanbanRefusal, LoggedEvent } from './kanban.ts';
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

const HUMAN_GATES: ItemStatus[] = ['awaiting-approval', 'awaiting-merge'];

const TERMINAL: ItemStatus = 'shipped';

const MOVE_GATE = 'transition';

function refusedState(refusal: KanbanRefusal): StageState {
  return refusal.gate === MOVE_GATE ? 'sent-back' : 'changes-requested';
}

// Every human gate the machine can reach stands open to whoever is watching,
// so the canvas asks them for the move rather than naming someone else.
function standingState(status: ItemStatus, refusal: KanbanRefusal | undefined): StageState {
  if (refusal !== undefined) {
    return refusedState(refusal);
  }

  if (status === TERMINAL) {
    return 'done';
  }

  return HUMAN_GATES.includes(status) ? 'needs-you' : 'running';
}

function stageNode(
  visit: Visit,
  state: StageState,
  refusal: KanbanRefusal | undefined,
): JourneyNode {
  return {
    id: visit.id,
    title: visit.status,
    state,
    at: visit.at,
    until: visit.until,
    refusal,
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

function stageNodes(walk: Walk, refusal: KanbanRefusal | undefined): JourneyNode[] {
  const last = walk.visited.length - 1;
  const walked = walk.visited.map((visit, index) =>
    index === last
      ? stageNode(visit, standingState(visit.status, refusal), refusal)
      : stageNode(visit, 'done', undefined),
  );

  return [...walked, ...walk.ahead.map((visit) => stageNode(visit, 'future', undefined))];
}

function itemAt(stored: StoredItem[], key: string): Item | undefined {
  const entry = stored.find((candidate) => candidate.key === key);

  return entry === undefined ? undefined : parseItem(entry.contents);
}

export function foldJourney(stored: StoredItem[], log: string, key: string): Journey | undefined {
  const item = itemAt(stored, key);

  if (item === undefined) {
    return undefined;
  }

  const events = eventsAbout(log, key);
  const walk = walkOf(events, item.status);
  const arrived = walk.visited.at(-1)?.at;
  const refusal = arrived === undefined ? undefined : refusalAfter(events, arrived);

  return {
    item: key,
    title: item.title,
    description: item.description,
    nodes: stageNodes(walk, refusal),
    edges: stageEdges([...walk.visited, ...walk.ahead]),
    standing: refusal?.reason,
    artifacts: artifactsOf(events, key),
    children: childrenOf(stored, log, item.children),
  };
}
