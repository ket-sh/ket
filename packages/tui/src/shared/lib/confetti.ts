import type { Theme } from '../theme/themes.ts';
import type { Cell, Ln } from './grid.ts';

import { KANAGAWA } from '../theme/themes.ts';
import { spansOf } from './grid.ts';

const FLAKES = ['✦', '✧', '•', '▪', '*'];

function tintsOf(theme: Theme): string[] {
  return [theme.green, theme.yellow, theme.blue, theme.pink, theme.violet];
}

function flakeAt(x: number, y: number, tick: number, rows: number, tints: string[]): Cell {
  const fall = (y + (tick >> 1)) % rows;
  const seed = x * 13 + fall * 29 + (tick >> 2) * 7;

  if (seed % 9 !== 0) {
    return { ch: ' ' };
  }

  return { ch: FLAKES[seed % FLAKES.length] ?? '•', fg: tints[seed % tints.length] };
}

export function confettiRows(
  tick: number,
  width: number,
  rows: number,
  theme: Theme = KANAGAWA,
): Ln[] {
  const tints = tintsOf(theme);

  return Array.from({ length: rows }, (_, y) =>
    spansOf(Array.from({ length: width }, (_, x) => flakeAt(x, y, tick, rows, tints))),
  );
}
