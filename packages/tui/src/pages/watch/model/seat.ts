import { useState } from 'react';

import type { KanbanCardView, KanbanColumnView } from '../../../shared/model';
import type { Nudge } from './compass.ts';

export interface Seat {
  col: number;
  row: number;
  chosen: KanbanCardView | undefined;
  move: (delta: Nudge) => void;
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), Math.max(low, high));
}

function depthOf(lived: KanbanColumnView[], col: number): number {
  return Math.max(0, (lived[col]?.cards.length ?? 1) - 1);
}

export function livedIn(columns: KanbanColumnView[]): KanbanColumnView[] {
  return columns.filter((column) => column.cards.length > 0 || column.status === 'triaged');
}

export function useSeat(lived: KanbanColumnView[]): Seat {
  const [spot, setSpot] = useState<Nudge>({ col: 0, row: 0 });
  const col = clamp(spot.col, 0, Math.max(0, lived.length - 1));
  const row = clamp(spot.row, 0, depthOf(lived, col));

  const move = (delta: Nudge): void => {
    const landing = clamp(col + delta.col, 0, Math.max(0, lived.length - 1));

    setSpot({ col: landing, row: clamp(row + delta.row, 0, depthOf(lived, landing)) });
  };

  return { col, row, chosen: lived[col]?.cards[row], move };
}
