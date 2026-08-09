import type { Cell } from '../../../shared/lib';
import type { JourneyView } from '../../../shared/model';
import type { Theme } from '../../../shared/theme';
import type { PlacedNode } from './layout.ts';

import { put } from '../../../shared/lib';
import { NODE_W } from './layout.ts';

type Tracer = (x: number, y: number, ch: string) => void;

function traceBend(step: Tracer, midX: number, y1: number, y2: number): void {
  step(midX, y1, y2 > y1 ? '╮' : '╯');

  const [low, high] = y1 < y2 ? [y1, y2] : [y2, y1];

  for (let y = low + 1; y < high; y += 1) {
    step(midX, y, '│');
  }

  step(midX, y2, y2 > y1 ? '╰' : '╭');
}

function drawEdge(grid: Cell[][], from: PlacedNode, to: PlacedNode, fg: string): void {
  const step: Tracer = (x, y, ch) => {
    put(grid, x, y, ch, fg);
  };
  const startX = from.x + NODE_W;
  const y1 = from.y + 2;
  const y2 = to.y + 2;
  const endX = to.x - 1;
  const midX = to.x - 4;

  if (y1 === y2) {
    for (let x = startX; x < endX; x += 1) {
      step(x, y1, '─');
    }
  } else {
    for (let x = startX; x < midX; x += 1) {
      step(x, y1, '─');
    }

    traceBend(step, midX, y1, y2);

    for (let x = midX + 1; x < endX; x += 1) {
      step(x, y2, '─');
    }
  }

  step(endX, y2, '►');
}

function edgeTone(edge: [string, string], selectedId: string, theme: Theme): string {
  return edge.includes(selectedId) ? theme.overlay : theme.surface1;
}

export function drawEdges(
  grid: Cell[][],
  journey: JourneyView,
  nodes: PlacedNode[],
  selectedId: string,
  theme: Theme,
): void {
  const byId = new Map(nodes.map((node) => [node.id, node]));

  for (const edge of journey.edges) {
    const source = byId.get(edge[0]);
    const target = byId.get(edge[1]);

    if (source !== undefined && target !== undefined) {
      drawEdge(grid, source, target, edgeTone(edge, selectedId, theme));
    }
  }
}
