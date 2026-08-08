import type { Cell, Ln } from '../../../shared/lib';
import type { JourneyView, StageStateView } from '../../../shared/model';
import type { Theme } from '../../../shared/theme';
import type { PlacedNode } from './layout.ts';

import { ageOf, boxAt, gridOf, lerpHex, put, spansOf, writeText } from '../../../shared/lib';
import { KANAGAWA, stageColorOf } from '../../../shared/theme';
import { waitsOnAHuman } from './attention.ts';
import { NODE_H, NODE_W, placedOf } from './layout.ts';

const SPINNER = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

const HUMAN_GATE = '‖';

const REFUSED = '✗';

// Word, glyph and color always travel together, so the state survives a
// terminal that drops color entirely.
const SPOKEN: Record<StageStateView, string> = {
  done: 'Done',
  running: 'Running',
  'needs-you': 'Needs you',
  'changes-requested': 'Changes requested',
  'sent-back': 'Sent back',
  future: 'Not started',
};

const GLYPH: Record<Exclude<StageStateView, 'running'>, string> = {
  done: '✓',
  'needs-you': HUMAN_GATE,
  'changes-requested': REFUSED,
  'sent-back': REFUSED,
  future: '○',
};

function glyphOf(state: StageStateView, tick: number): string {
  return state === 'running' ? (SPINNER[tick % SPINNER.length] ?? '●') : GLYPH[state];
}

function toneOf(state: StageStateView, theme: Theme): string {
  const tones: Record<StageStateView, string> = {
    done: theme.green,
    running: theme.blue,
    'needs-you': theme.yellow,
    'changes-requested': theme.red,
    'sent-back': theme.red,
    future: theme.overlay,
  };

  return tones[state];
}

export interface Viewport {
  width: number;
  height: number;
}

function frameColorOf(node: PlacedNode, theme: Theme): string {
  return stageColorOf(theme)[node.title] ?? theme.overlay;
}

interface Border {
  style: 'rounded' | 'double';
  fg: string;
}

function isGate(node: PlacedNode): boolean {
  return waitsOnAHuman(node.title);
}

function invites(node: PlacedNode): boolean {
  return isGate(node) && node.state === 'needs-you';
}

function borderOf(node: PlacedNode, selectedId: string, theme: Theme): Border {
  const frame = frameColorOf(node, theme);

  if (node.id === selectedId) {
    return { style: 'double', fg: frame };
  }

  return { style: 'rounded', fg: invites(node) ? frame : lerpHex(frame, theme.base, 0.55) };
}

function trimmedTo(title: string, room: number): string {
  return title.length <= room ? title : `${title.slice(0, room - 1)}…`;
}

function stateOf(node: PlacedNode, tick: number): string {
  return `${glyphOf(node.state, tick)} ${SPOKEN[node.state]}`;
}

function titleOf(node: PlacedNode): string {
  return isGate(node) ? `${HUMAN_GATE} ${node.title}` : node.title;
}

function titleToneOf(node: PlacedNode, theme: Theme): string {
  if (node.state === 'future') {
    return theme.subtext;
  }

  return isGate(node) ? frameColorOf(node, theme) : theme.text;
}

function heldFor(node: PlacedNode, now: string): string {
  return node.at === undefined ? '' : ageOf(node.at, node.until ?? now);
}

function heldLineOf(node: PlacedNode, now: string): string {
  const held = heldFor(node, now);

  if (!invites(node)) {
    return held;
  }

  return held === '' ? 'yours' : `yours · ${held}`;
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
    trimmedTo(titleOf(node), NODE_W - 4),
    titleToneOf(node, theme),
  );
  writeText(
    grid,
    node.x + 2,
    node.y + 2,
    trimmedTo(stateOf(node, clock.tick), NODE_W - 4),
    toneOf(node.state, theme),
  );
  writeText(grid, node.x + 2, node.y + 3, heldLineOf(node, clock.now), theme.subtext);
  writeText(
    grid,
    node.x + 2,
    node.y + 4,
    node.note === undefined ? '' : trimmedTo(node.note.text, NODE_W - 4),
    theme.gray,
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

function drawEdges(
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

function panOf(center: number, view: number, size: number): number {
  return Math.floor(Math.min(Math.max(center - view / 2, 0), Math.max(0, size - view)));
}

function centerOf(selected: PlacedNode | undefined): { x: number; y: number } {
  if (selected === undefined) {
    return { x: 0, y: 0 };
  }

  return { x: selected.x + NODE_W / 2, y: selected.y + NODE_H / 2 };
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

  drawEdges(grid, journey, placed.nodes, selectedId, theme);

  for (const node of placed.nodes) {
    drawNode(grid, node, borderOf(node, selectedId, theme), { now, tick }, theme);
  }

  const center = centerOf(placed.nodes.find((node) => node.id === selectedId));
  const panX = panOf(center.x, view.width, placed.width);
  const panY = panOf(center.y, view.height, placed.height);

  return grid
    .slice(panY, panY + view.height)
    .map((row) => spansOf(row.slice(panX, panX + view.width)));
}
