import type { GateSemantics } from '@ket/preset';

import type { Reading } from './timeline.ts';

import { isMove } from './timeline.ts';

export interface DormantGate {
  gate: string;
  guards: string;
  seen: number | undefined;
}

const BEFORE_ANY_MOMENT = 0;

function anythingMoved(reading: Reading): boolean {
  return reading.windowed.some((event) => isMove(event));
}

function quietIn(reading: Reading, script: string): boolean {
  return !reading.windowed.some((event) => event.gate === script);
}

function lastRecorded(reading: Reading, script: string): number | undefined {
  return reading.timeline.filter((event) => event.gate === script).at(-1)?.at;
}

function dormantOf(reading: Reading, gate: GateSemantics): DormantGate {
  return { gate: gate.script, guards: gate.guards, seen: lastRecorded(reading, gate.script) };
}

function quietSince(entry: DormantGate): number {
  return entry.seen ?? BEFORE_ANY_MOMENT;
}

function byQuiet(one: DormantGate, next: DormantGate): number {
  return quietSince(one) - quietSince(next) || one.gate.localeCompare(next.gate);
}

export function dormantIn(reading: Reading, gates: GateSemantics[]): DormantGate | undefined {
  if (!anythingMoved(reading)) {
    return undefined;
  }

  return gates
    .filter((gate) => quietIn(reading, gate.script))
    .map((gate) => dormantOf(reading, gate))
    .toSorted(byQuiet)
    .at(0);
}
