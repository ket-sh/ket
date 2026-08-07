import type { Cell, Ln } from '../../../shared/lib';
import type { CalloutView, SketchView } from '../../../shared/model';
import type { Theme } from '../../../shared/theme';

import { boxAt, gridOf, lerpHex, put, spansOf, writeText } from '../../../shared/lib';
import { KANAGAWA } from '../../../shared/theme';
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
  theme: Theme,
): void {
  const startX = from.x + from.w;
  const endX = to.x - 1;
  const y = from.y + 1;

  for (let x = startX; x < endX; x += 1) {
    put(grid, x, y, '─', theme.overlay);
  }

  put(grid, endX, y, '►', theme.overlay);

  if (label !== undefined) {
    writeText(
      grid,
      startX + Math.floor((endX - startX - label.length) / 2),
      y - 2,
      label,
      theme.subtext,
    );
  }
}

function drawEdges(grid: Cell[][], sketch: SketchView, placed: MiniPlaced[], theme: Theme): void {
  const byId = new Map(placed.map((node) => [node.id, node]));

  for (const edge of sketch.edges) {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);

    if (from !== undefined && to !== undefined) {
      drawMiniEdge(grid, from, to, edge.label, theme);
    }
  }
}

function badgeOn(grid: Cell[][], node: MiniPlaced, callouts: CalloutView[], theme: Theme): void {
  const order = callouts.findIndex((callout) => callout.shape === node.id);

  if (order >= 0) {
    writeText(grid, node.x + node.w - 2, node.y, SUPERSCRIPT[order] ?? '¹', theme.yellow);
  }
}

export function sketchLines(
  sketch: SketchView,
  callouts: CalloutView[],
  theme: Theme = KANAGAWA,
): Ln[] {
  const { placed, width, height } = miniPlaced(sketch);
  const grid = gridOf(width, height);

  drawEdges(grid, sketch, placed, theme);

  for (const node of placed) {
    boxAt(grid, node.x, node.y, node.w, MINI_H, 'rounded', lerpHex(theme.blue, theme.base, 0.35));
    writeText(grid, node.x + 2, node.y + 1, node.label, theme.text);
    badgeOn(grid, node, callouts, theme);
  }

  return grid.map((row) => spansOf(row));
}

export function legendLn(callouts: CalloutView[], theme: Theme = KANAGAWA): Ln[] {
  return callouts.map((callout, index) => [
    { text: ` ${SUPERSCRIPT[index] ?? '¹'} `, fg: theme.yellow },
    { text: callout.shape, fg: theme.text },
  ]);
}
