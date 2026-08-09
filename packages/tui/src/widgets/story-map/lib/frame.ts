import type { MapBandView } from '../../../shared/model';
import type { MapColumn } from './columns.ts';

import { wrappedTo } from '../../../shared/lib';
import { cardsUnder } from './columns.ts';

export interface MapFrame {
  cols: number;
  rows: number;
}

const BAND_SIDES = 4;

const CARD_SIDES = 4;

const CARD_BORDERS = 2;

const BAND_FRAME_AND_MARGIN = 3;

const UNBOUNDED_LINES = Number.MAX_SAFE_INTEGER;

export function columnWidthsOf(cols: number, count: number): number[] {
  if (count === 0) {
    return [];
  }

  const interior = Math.max(0, cols - BAND_SIDES);
  const base = Math.floor(interior / count);
  const leftover = interior - base * count;

  return Array.from({ length: count }, (_, at) => (at < leftover ? base + 1 : base));
}

export function cardLinesOf(name: string, columnWidth: number): string[] {
  return wrappedTo(name, columnWidth - CARD_SIDES, UNBOUNDED_LINES);
}

function columnHeightOf(band: MapBandView, column: MapColumn, width: number): number {
  return cardsUnder(band, column.id)
    .map((card) => cardLinesOf(card.name, width).length + CARD_BORDERS)
    .reduce((stacked, height) => stacked + height, 0);
}

export function bandHeightOf(band: MapBandView, columns: MapColumn[], widths: number[]): number {
  const tallest = columns
    .map((column, at) => columnHeightOf(band, column, widths[at] ?? 0))
    .reduce((highest, height) => Math.max(highest, height), 0);

  return tallest + BAND_FRAME_AND_MARGIN;
}

export function shownBandsOf(
  bands: MapBandView[],
  columns: MapColumn[],
  widths: number[],
  room: number,
): number {
  let used = 0;
  let seated = 0;

  for (const band of bands) {
    used += bandHeightOf(band, columns, widths);

    if (used > room) {
      return seated;
    }

    seated += 1;
  }

  return seated;
}
