import { useState } from 'react';

import type { KanbanCardView, KanbanColumnView } from '../../../shared/model';
import type { Nudge } from './compass.ts';

export interface Seat {
  col: number;
  row: number;
  chosen: KanbanCardView | undefined;
  move: (delta: Nudge) => void;
  slide: (delta: number) => void;
  seek: (key: string) => void;
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

function spotsOf(lived: KanbanColumnView[]): Nudge[] {
  return lived.flatMap((column, col) => column.cards.map((_, row) => ({ col, row })));
}

function spotOf(lived: KanbanColumnView[], key: string): Nudge | undefined {
  return lived.flatMap((column, col) =>
    column.cards.flatMap((card, row) => (card.key === key ? [{ col, row }] : [])),
  )[0];
}

export function useSeat(lived: KanbanColumnView[]): Seat {
  const [spot, setSpot] = useState<Nudge>({ col: 0, row: 0 });
  const col = clamp(spot.col, 0, Math.max(0, lived.length - 1));
  const row = clamp(spot.row, 0, depthOf(lived, col));

  const move = (delta: Nudge): void => {
    const landing = clamp(col + delta.col, 0, Math.max(0, lived.length - 1));

    setSpot({ col: landing, row: clamp(row + delta.row, 0, depthOf(lived, landing)) });
  };

  const slide = (delta: number): void => {
    const spots = spotsOf(lived);
    const current = spots.findIndex((one) => one.col === col && one.row === row);
    const landing = spots[clamp(current + delta, 0, Math.max(0, spots.length - 1))];

    if (landing !== undefined) {
      setSpot(landing);
    }
  };

  const seek = (key: string): void => {
    const found = spotOf(lived, key);

    if (found !== undefined && (found.col !== col || found.row !== row)) {
      setSpot(found);
    }
  };

  return { col, row, chosen: lived[col]?.cards[row], move, slide, seek };
}
