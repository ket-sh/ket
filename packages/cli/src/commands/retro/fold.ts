import type { GateSemantics } from '@ket/preset';

import type { StoredItem } from '../../shared/read-item.ts';
import type { DormantGate } from './dormant.ts';
import type { Draft } from './draft.ts';
import type { Friction, RefusalCluster } from './friction.ts';
import type { WeekInItems } from './items.ts';
import type { Reading } from './timeline.ts';
import type { RetroWindow } from './window.ts';

import { dormantIn } from './dormant.ts';
import { clusterDraftOf, dormantDraftOf } from './draft.ts';
import { frictionIn } from './friction.ts';
import { weekInItems } from './items.ts';
import { readingOf } from './timeline.ts';

type RetroArm = { cluster: RefusalCluster } | { dormant: DormantGate };

export type RetroAction = RetroArm & { draft: Draft };

export interface Retro extends WeekInItems, Friction {
  window: RetroWindow;
  events: number;
  actions: RetroAction[];
}

function actionsIn(
  reading: Reading,
  clusters: RefusalCluster[],
  gates: GateSemantics[],
): RetroAction[] {
  if (clusters.length > 0) {
    return clusters.map((cluster, held) => ({ cluster, draft: clusterDraftOf(cluster, held + 1) }));
  }

  const dormant = dormantIn(reading, gates);

  return dormant === undefined ? [] : [{ dormant, draft: dormantDraftOf(dormant) }];
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
    actions: actionsIn(reading, friction.clusters, gates),
  };
}
