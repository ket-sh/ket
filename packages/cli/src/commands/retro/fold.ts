import type { StoredItem } from '../../shared/read-item.ts';
import type { Friction, RefusalCluster } from './friction.ts';
import type { WeekInItems } from './items.ts';
import type { RetroWindow } from './window.ts';

import { frictionIn } from './friction.ts';
import { weekInItems } from './items.ts';
import { readingOf } from './timeline.ts';

export interface Retro extends WeekInItems, Friction {
  window: RetroWindow;
  events: number;
  action: RefusalCluster | undefined;
}

export function foldRetro(stored: StoredItem[], log: string, window: RetroWindow): Retro {
  const reading = readingOf(stored, log, window);
  const friction = frictionIn(reading);

  return {
    window,
    events: reading.windowed.length,
    ...weekInItems(reading),
    ...friction,
    action: friction.clusters.at(0),
  };
}
