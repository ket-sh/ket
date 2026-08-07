import type { Cell, Ln } from '../../../shared/lib';
import type { CalloutView, SketchView } from '../../../shared/model';

import { boxAt, gridOf, lerpHex, put, spansOf, writeText } from '../../../shared/lib';
import { BASE, BLUE, OVERLAY, SUBTEXT, TEXT, YELLOW } from '../../../shared/theme';
import { SUPERSCRIPT } from './pen.ts';

const MINI_H = 3;

interface MiniPlaced {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
}

function miniPlaced(sketch: SketchView): { placed: MiniPlaced[]; width: number; height: number } {
  let cursor = 1;
  const placed = sketch.nodes.map((node) => {
    const w = node.label.length + 4;
    const seat = { id: node.id, label: node.label, x: cursor, y: 2, w };

    cursor += w + 14;

    return seat;
  });

  return { placed, width: Math.max(cursor - 14 + 2, 2), height: MINI_H + 3 };
}

function drawMiniEdge(
  grid: Cell[][],
  from: MiniPlaced,
  to: MiniPlaced,
  label: string | undefined,
): void {
  const startX = from.x + from.w;
  const endX = to.x - 1;
  const y = from.y + 1;

  for (let x = startX; x < endX; x += 1) {
    put(grid, x, y, '─', OVERLAY);
  }

  put(grid, endX, y, '►', OVERLAY);

  if (label !== undefined) {
    writeText(grid, startX + Math.floor((endX - startX - label.length) / 2), y - 2, label, SUBTEXT);
  }
}

function drawEdges(grid: Cell[][], sketch: SketchView, placed: MiniPlaced[]): void {
  const byId = new Map(placed.map((node) => [node.id, node]));

  for (const edge of sketch.edges) {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);

    if (from !== undefined && to !== undefined) {
      drawMiniEdge(grid, from, to, edge.label);
    }
  }
}

function badgeOn(grid: Cell[][], node: MiniPlaced, callouts: CalloutView[]): void {
  const order = callouts.findIndex((callout) => callout.shape === node.id);

  if (order >= 0) {
    writeText(grid, node.x + node.w - 2, node.y, SUPERSCRIPT[order] ?? '¹', YELLOW);
  }
}

export function sketchLines(sketch: SketchView, callouts: CalloutView[]): Ln[] {
  const { placed, width, height } = miniPlaced(sketch);
  const grid = gridOf(width, height);

  drawEdges(grid, sketch, placed);

  for (const node of placed) {
    boxAt(grid, node.x, node.y, node.w, MINI_H, 'rounded', lerpHex(BLUE, BASE, 0.35));
    writeText(grid, node.x + 2, node.y + 1, node.label, TEXT);
    badgeOn(grid, node, callouts);
  }

  return grid.map((row) => spansOf(row));
}

export function legendLn(callouts: CalloutView[]): Ln[] {
  return callouts.map((callout, index) => [
    { text: ` ${SUPERSCRIPT[index] ?? '¹'} `, fg: YELLOW },
    { text: callout.shape, fg: TEXT },
  ]);
}
