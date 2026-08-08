import type { ItemSize, ItemStatus } from '../../shared/item.ts';
import type { Reading, TimedEvent } from './timeline.ts';

import { isInFlight, ITEM_STATUSES } from '../../shared/item.ts';
import { machineStepOf } from '../../shared/transition.ts';
import { heldBy } from './items.ts';
import { eventsOn, gapsAmong, isMove, isRefusal, isWithin, stageAt } from './timeline.ts';

export interface RefusalCluster {
  gate: string;
  reason: string;
  count: number;
  moments: number[];
  items: string[];
}

export interface Stall {
  key: string;
  stage: string;
  span: number;
}

export interface Rework {
  key: string;
  count: number;
}

export interface Friction {
  clusters: RefusalCluster[];
  stall: Stall | undefined;
  rework: Rework[];
  waiting: number;
  working: number;
}

type Owing = 'waiting' | 'working' | 'nobody';

interface Owed {
  owing: Owing;
  span: number;
}

interface Walk {
  held: number | undefined;
  count: number;
}

const UNNAMED_GATE = 'an unnamed gate';

const UNNAMED_REASON = 'no reason recorded';

function openingLineOf(text: string): string {
  const brk = text.indexOf('\n');

  return brk === -1 ? text : text.slice(0, brk);
}

function reasonOf(event: TimedEvent): string {
  const opening = openingLineOf(event.reason ?? '');

  return opening === '' ? UNNAMED_REASON : opening;
}

function byWeight(one: RefusalCluster, next: RefusalCluster): number {
  return (
    next.count - one.count ||
    one.gate.localeCompare(next.gate) ||
    one.reason.localeCompare(next.reason)
  );
}

function openedAmong(counted: RefusalCluster[], gate: string, reason: string): RefusalCluster {
  const cluster = { gate, reason, count: 0, moments: [], items: [] };

  counted.push(cluster);

  return cluster;
}

function grownWith(held: RefusalCluster, event: TimedEvent): void {
  held.count += 1;
  held.moments.push(event.at);

  if (event.item !== undefined && !held.items.includes(event.item)) {
    held.items.push(event.item);
  }
}

function clusteredRefusals(windowed: TimedEvent[]): RefusalCluster[] {
  const counted: RefusalCluster[] = [];

  for (const event of windowed.filter((candidate) => isRefusal(candidate))) {
    const gate = event.gate ?? UNNAMED_GATE;
    const reason = reasonOf(event);
    const held =
      counted.find((cluster) => cluster.gate === gate && cluster.reason === reason) ??
      openedAmong(counted, gate, reason);

    grownWith(held, event);
  }

  return counted.sort(byWeight);
}

function stallsAmong(reading: Reading, key: string, standing: string): Stall[] {
  return gapsAmong(eventsOn(reading.windowed, key)).map((gap) => ({
    key,
    stage: stageAt(reading, key, gap.opened, standing),
    span: gap.span,
  }));
}

function longestStall(reading: Reading): Stall | undefined {
  return heldBy(reading.stored)
    .filter((entry) => isInFlight(entry.item.status))
    .flatMap((entry) => stallsAmong(reading, entry.key, entry.item.status))
    .sort((one, next) => next.span - one.span)
    .at(0);
}

function rankOf(status: string | undefined): number | undefined {
  const at = ITEM_STATUSES.findIndex((known) => known === status);

  return at === -1 ? undefined : at;
}

function turnedBack(held: number | undefined, rank: number): boolean {
  return held !== undefined && rank < held;
}

function steppedThrough(walk: Walk, move: TimedEvent, reading: Reading): Walk {
  const rank = rankOf(move.about);

  if (rank === undefined) {
    return walk;
  }

  const back = turnedBack(walk.held, rank) && isWithin(move, reading.window);

  return { held: rank, count: walk.count + (back ? 1 : 0) };
}

function reworkOn(reading: Reading, key: string): number {
  return eventsOn(reading.timeline, key)
    .filter((event) => isMove(event))
    .reduce<Walk>((walk, move) => steppedThrough(walk, move, reading), {
      held: undefined,
      count: 0,
    }).count;
}

function reworkAmong(reading: Reading): Rework[] {
  const named = reading.windowed.map((event) => event.item).filter((item) => item !== undefined);

  return [...new Set(named)]
    .map((key) => ({ key, count: reworkOn(reading, key) }))
    .filter((entry) => entry.count > 0);
}

function statusOf(stage: string): ItemStatus | undefined {
  return ITEM_STATUSES.find((known) => known === stage);
}

// A stage the machine has no next step at is a stage waiting on a person, which
// is why the answer changes with the size: a triaged story owes a design, and a
// triaged subtask owes an approval.
function owingAt(stage: string, size: ItemSize): Owing {
  const status = statusOf(stage);

  if (status === undefined || !isInFlight(status)) {
    return 'nobody';
  }

  return machineStepOf({ status, size }) === undefined ? 'waiting' : 'working';
}

function owedAmong(reading: Reading): Owed[] {
  return heldBy(reading.stored).flatMap((entry) =>
    gapsAmong(eventsOn(reading.windowed, entry.key)).map((gap) => ({
      owing: owingAt(stageAt(reading, entry.key, gap.opened, entry.item.status), entry.item.size),
      span: gap.span,
    })),
  );
}

function totalOwed(owed: Owed[], owing: Owing): number {
  return owed.filter((entry) => entry.owing === owing).reduce((sum, entry) => sum + entry.span, 0);
}

export function frictionIn(reading: Reading): Friction {
  const owed = owedAmong(reading);

  return {
    clusters: clusteredRefusals(reading.windowed),
    stall: longestStall(reading),
    rework: reworkAmong(reading),
    waiting: totalOwed(owed, 'waiting'),
    working: totalOwed(owed, 'working'),
  };
}
