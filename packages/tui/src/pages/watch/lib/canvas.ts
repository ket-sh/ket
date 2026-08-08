import type { Cell, Ln } from '../../../shared/lib';
import type { JourneyView } from '../../../shared/model';
import type { Theme } from '../../../shared/theme';
import type { PlacedNode } from './layout.ts';

import { ageOf, boxAt, gridOf, lerpHex, put, spansOf, writeText } from '../../../shared/lib';
import { KANAGAWA, stageColorOf } from '../../../shared/theme';
import { NODE_H, NODE_W, placedOf } from './layout.ts';

const SPINNER = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export interface Viewport {
  width: number;
  height: number;
}

function frameColorOf(node: PlacedNode, theme: Theme): string {
  return stageColorOf(theme)[node.title] ?? theme.overlay;
}

function pulseOf(color: string, tick: number, theme: Theme): string {
  return lerpHex(color, theme.text, 0.3 + 0.3 * Math.sin(tick * 0.7));
}

function markGlyphOf(node: PlacedNode, tick: number): string {
  if (node.mark === 'done') {
    return '✓';
  }

  return node.mark === 'active' ? (SPINNER[tick % SPINNER.length] ?? '●') : '○';
}

function markColorOf(node: PlacedNode, theme: Theme): string {
  if (node.mark === 'done') {
    return theme.green;
  }

  return node.mark === 'active' ? theme.yellow : theme.overlay;
}

interface Border {
  style: 'rounded' | 'double';
  fg: string;
}

function borderOf(node: PlacedNode, selectedId: string, tick: number, theme: Theme): Border {
  const frame = frameColorOf(node, theme);

  return node.id === selectedId
    ? { style: 'double', fg: pulseOf(frame, tick, theme) }
    : { style: 'rounded', fg: lerpHex(frame, theme.base, 0.55) };
}

function trimmedTo(title: string, room: number): string {
  return title.length <= room ? title : `${title.slice(0, room - 1)}…`;
}

function subOf(node: PlacedNode, now: string, tick: number): string {
  return `${markGlyphOf(node, tick)} ${node.at === undefined ? 'waiting' : ageOf(node.at, now)}`;
}

interface Clock {
  now: string;
  tick: number;
}

function drawNode(
  grid: Cell[][],
  node: PlacedNode,
  border: Border,
  clock: Clock,
  theme: Theme,
): void {
  boxAt(grid, node.x, node.y, NODE_W, NODE_H, border.style, border.fg);

  writeText(
    grid,
    node.x + 2,
    node.y + 1,
    trimmedTo(node.title, NODE_W - 4),
    node.mark === 'future' ? theme.subtext : theme.text,
  );
  writeText(
    grid,
    node.x + 2,
    node.y + 2,
    subOf(node, clock.now, clock.tick),
    markColorOf(node, theme),
  );
}

type Tracer = (x: number, y: number, ch: string) => void;

function traceBend(step: Tracer, midX: number, y1: number, y2: number): void {
  step(midX, y1, y2 > y1 ? '╮' : '╯');

  const [low, high] = y1 < y2 ? [y1, y2] : [y2, y1];

  for (let y = low + 1; y < high; y += 1) {
    step(midX, y, '│');
  }

  step(midX, y2, y2 > y1 ? '╰' : '╭');
}

function drawEdge(
  grid: Cell[][],
  from: PlacedNode,
  to: PlacedNode,
  fg: string,
): [number, number][] {
  const cells: [number, number][] = [];
  const step: Tracer = (x, y, ch) => {
    put(grid, x, y, ch, fg);
    cells.push([x, y]);
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

  return cells;
}

function drawnFlows(
  grid: Cell[][],
  journey: JourneyView,
  nodes: PlacedNode[],
  selectedId: string,
  theme: Theme,
): [number, number][][] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const warm = journey.edges.filter(([from, to]) => from === selectedId || to === selectedId);
  const cold = journey.edges.filter((edge) => !warm.includes(edge));
  const flows: [number, number][][] = [];
  const drawn = (edge: [string, string], fg: string): [number, number][] | undefined => {
    const source = byId.get(edge[0]);
    const target = byId.get(edge[1]);

    return source === undefined || target === undefined
      ? undefined
      : drawEdge(grid, source, target, fg);
  };

  for (const edge of cold) {
    drawn(edge, theme.surface1);
  }

  for (const edge of warm) {
    const cells = drawn(edge, theme.overlay);

    if (cells !== undefined) {
      flows.push(cells);
    }
  }

  return flows;
}

function panOf(center: number, view: number, size: number): number {
  return Math.floor(Math.min(Math.max(center - view / 2, 0), Math.max(0, size - view)));
}

function centerOf(selected: PlacedNode | undefined): { x: number; y: number } {
  if (selected === undefined) {
    return { x: 0, y: 0 };
  }

  return { x: selected.x + NODE_W / 2, y: selected.y + NODE_H / 2 };
}

function dotted(grid: Cell[][], flows: [number, number][][], tick: number, theme: Theme): void {
  for (const cells of flows) {
    const dot = cells[tick % cells.length];

    if (dot !== undefined) {
      writeText(grid, dot[0], dot[1], '●', theme.blue);
    }
  }
}

export function journeyRows(
  journey: JourneyView,
  selectedId: string,
  now: string,
  tick: number,
  view: Viewport,
  theme: Theme = KANAGAWA,
): Ln[] {
  const placed = placedOf(journey);
  const grid = gridOf(Math.max(placed.width, view.width), Math.max(placed.height, view.height));

  dotted(grid, drawnFlows(grid, journey, placed.nodes, selectedId, theme), tick, theme);

  for (const node of placed.nodes) {
    drawNode(grid, node, borderOf(node, selectedId, tick, theme), { now, tick }, theme);
  }

  const center = centerOf(placed.nodes.find((node) => node.id === selectedId));
  const panX = panOf(center.x, view.width, placed.width);
  const panY = panOf(center.y, view.height, placed.height);

  return grid
    .slice(panY, panY + view.height)
    .map((row) => spansOf(row.slice(panX, panX + view.width)));
}
