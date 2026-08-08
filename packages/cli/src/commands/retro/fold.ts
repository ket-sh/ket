import type { GateSemantics } from '@ket/preset';

import type { StoredItem } from '../../shared/read-item.ts';
import type { DormantGate } from './dormant.ts';
import type { Friction, RefusalCluster } from './friction.ts';
import type { WeekInItems } from './items.ts';
import type { Reading } from './timeline.ts';
import type { RetroWindow } from './window.ts';

import { dormantIn } from './dormant.ts';
import { frictionIn } from './friction.ts';
import { weekInItems } from './items.ts';
import { readingOf } from './timeline.ts';

export type RetroAction = { cluster: RefusalCluster } | { dormant: DormantGate };

export interface Retro extends WeekInItems, Friction {
  window: RetroWindow;
  events: number;
  action: RetroAction | undefined;
}

function actionIn(
  reading: Reading,
  clusters: RefusalCluster[],
  gates: GateSemantics[],
): RetroAction | undefined {
  const cluster = clusters.at(0);

  if (cluster !== undefined) {
    return { cluster };
  }

  const dormant = dormantIn(reading, gates);

  return dormant === undefined ? undefined : { dormant };
}

export function foldRetro(
  stored: StoredItem[],
  log: string,
  window: RetroWindow,
  gates: GateSemantics[] = [],
): Retro {
  const reading = readingOf(stored, log, window);
  const friction = frictionIn(reading);

  return {
    window,
    events: reading.windowed.length,
    ...weekInItems(reading),
    ...friction,
    action: actionIn(reading, friction.clusters, gates),
  };
}
