export interface Cell {
  ch: string;
  fg?: string | undefined;
  bg?: string | undefined;
}

interface Span {
  text: string;
  fg?: string | undefined;
  bg?: string | undefined;
}

export type Ln = Span[];

const UP = 1;
const DOWN = 2;
const LEFT = 4;
const RIGHT = 8;

const STROKE_BITS: Record<string, number> = {
  '─': LEFT | RIGHT,
  '│': UP | DOWN,
  '╮': LEFT | DOWN,
  '╯': LEFT | UP,
  '╭': RIGHT | DOWN,
  '╰': RIGHT | UP,
  '├': UP | DOWN | RIGHT,
  '┤': UP | DOWN | LEFT,
  '┬': LEFT | RIGHT | DOWN,
  '┴': LEFT | RIGHT | UP,
  '┼': UP | DOWN | LEFT | RIGHT,
};

const BITS_STROKE = new Map(Object.entries(STROKE_BITS).map(([stroke, bits]) => [bits, stroke]));

export function gridOf(width: number, height: number): Cell[][] {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => ({ ch: ' ' })));
}

function mergedStroke(landing: string, held: string): string {
  const landingBits = STROKE_BITS[landing];
  const heldBits = STROKE_BITS[held];

  if (landingBits === undefined || heldBits === undefined) {
    return landing;
  }

  return BITS_STROKE.get(landingBits | heldBits) ?? landing;
}

export function put(grid: Cell[][], x: number, y: number, ch: string, fg?: string): void {
  const row = grid[y];
  const held = row?.[x];

  if (row === undefined || held === undefined) {
    return;
  }

  row[x] = { ch: mergedStroke(ch, held.ch), fg };
}

export function writeText(grid: Cell[][], x: number, y: number, text: string, fg?: string): void {
  const row = grid[y];

  if (row === undefined) {
    return;
  }

  Array.from(text).forEach((ch, index) => {
    if (x + index >= 0 && x + index < row.length) {
      row[x + index] = { ch, fg };
    }
  });
}

interface Frame {
  tl: string;
  tr: string;
  bl: string;
  br: string;
  h: string;
  v: string;
}

const ROUNDED: Frame = { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' };

const DOUBLE: Frame = { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║' };

export function boxAt(
  grid: Cell[][],
  x: number,
  y: number,
  width: number,
  height: number,
  style: 'rounded' | 'double',
  fg: string,
): void {
  const frame = style === 'double' ? DOUBLE : ROUNDED;

  for (let step = 1; step < width - 1; step += 1) {
    writeText(grid, x + step, y, frame.h, fg);
    writeText(grid, x + step, y + height - 1, frame.h, fg);
  }

  for (let step = 1; step < height - 1; step += 1) {
    writeText(grid, x, y + step, frame.v, fg);
    writeText(grid, x + width - 1, y + step, frame.v, fg);
  }

  writeText(grid, x, y, frame.tl, fg);
  writeText(grid, x + width - 1, y, frame.tr, fg);
  writeText(grid, x, y + height - 1, frame.bl, fg);
  writeText(grid, x + width - 1, y + height - 1, frame.br, fg);
}

export function spansOf(cells: Cell[]): Ln {
  const spans: Ln = [];

  for (const cell of cells) {
    const last = spans[spans.length - 1];

    if (last !== undefined && last.fg === cell.fg && last.bg === cell.bg) {
      last.text += cell.ch;
    } else {
      spans.push({ text: cell.ch, fg: cell.fg, bg: cell.bg });
    }
  }

  return spans;
}

function channelOf(hex: string, at: number): number {
  return parseInt(hex.slice(at, at + 2), 16);
}

export function lerpHex(from: string, to: string, amount: number): string {
  const mixed = (at: number): string =>
    Math.round(channelOf(from, at) + (channelOf(to, at) - channelOf(from, at)) * amount)
      .toString(16)
      .padStart(2, '0');

  return `#${mixed(1)}${mixed(3)}${mixed(5)}`;
}
