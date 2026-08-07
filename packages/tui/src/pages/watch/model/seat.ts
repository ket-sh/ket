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

function depthOf(columns: KanbanColumnView[], col: number): number {
  return Math.max(0, (columns[col]?.cards.length ?? 1) - 1);
}

function filledOf(columns: KanbanColumnView[]): number[] {
  return columns.flatMap((column, col) => (column.cards.length > 0 ? [col] : []));
}

function filledStep(filled: number[], col: number, delta: number): number {
  const at = filled.indexOf(col);

  return filled[clamp(at + delta, 0, Math.max(0, filled.length - 1))] ?? col;
}

function filledNear(filled: number[], col: number): number {
  return filled.find((one) => one >= col) ?? filled.at(-1) ?? col;
}

function spotsOf(columns: KanbanColumnView[]): Nudge[] {
  return columns.flatMap((column, col) => column.cards.map((_, row) => ({ col, row })));
}

function spotOf(columns: KanbanColumnView[], key: string): Nudge | undefined {
  return columns.flatMap((column, col) =>
    column.cards.flatMap((card, row) => (card.key === key ? [{ col, row }] : [])),
  )[0];
}

export function useSeat(columns: KanbanColumnView[]): Seat {
  const filled = filledOf(columns);
  const [spot, setSpot] = useState<Nudge>({ col: 0, row: 0 });
  const col = filledNear(filled, clamp(spot.col, 0, Math.max(0, columns.length - 1)));
  const row = clamp(spot.row, 0, depthOf(columns, col));

  const move = (delta: Nudge): void => {
    const landing = filledStep(filled, col, delta.col);

    setSpot({ col: landing, row: clamp(row + delta.row, 0, depthOf(columns, landing)) });
  };

  const slide = (delta: number): void => {
    const spots = spotsOf(columns);
    const current = spots.findIndex((one) => one.col === col && one.row === row);
    const landing = spots[clamp(current + delta, 0, Math.max(0, spots.length - 1))];

    if (landing !== undefined) {
      setSpot(landing);
    }
  };

  const seek = (key: string): void => {
    const found = spotOf(columns, key);

    if (found !== undefined && (found.col !== col || found.row !== row)) {
      setSpot(found);
    }
  };

  return { col, row, chosen: columns[col]?.cards[row], move, slide, seek };
}
