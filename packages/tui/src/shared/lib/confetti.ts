import type { Cell, Ln } from './grid.ts';

import { BLUE, GREEN, PINK, VIOLET, YELLOW } from '../theme';
import { spansOf } from './grid.ts';

const FLAKES = ['✦', '✧', '•', '▪', '*'];

const TINTS = [GREEN, YELLOW, BLUE, PINK, VIOLET];

function flakeAt(x: number, y: number, tick: number, rows: number): Cell {
  const fall = (y + (tick >> 1)) % rows;
  const seed = x * 13 + fall * 29 + (tick >> 2) * 7;

  if (seed % 9 !== 0) {
    return { ch: ' ' };
  }

  return { ch: FLAKES[seed % FLAKES.length] ?? '•', fg: TINTS[seed % TINTS.length] };
}

export function confettiRows(tick: number, width: number, rows: number): Ln[] {
  return Array.from({ length: rows }, (_, y) =>
    spansOf(Array.from({ length: width }, (_, x) => flakeAt(x, y, tick, rows))),
  );
}
