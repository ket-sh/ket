import type { Cell, Ln } from '../../../shared/lib';
import type { JourneyView, StageStateView } from '../../../shared/model';
import type { Theme } from '../../../shared/theme';
import type { Placed, PlacedNode } from './layout.ts';

import { ageOf, boxAt, gridOf, lerpHex, spansOf, writeText } from '../../../shared/lib';
import { KANAGAWA, stageColorOf } from '../../../shared/theme';
import { waitsOnAHuman } from './attention.ts';
import { drawEdges } from './canvas-edges.ts';
import { heightOf, NODE_H, NODE_W, placedOf, STEP_H } from './layout.ts';

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

const STEP_INSET = 2;

function drawSteps(grid: Cell[][], node: PlacedNode, theme: Theme): void {
  const frame = lerpHex(frameColorOf(node, theme), theme.base, 0.55);

  node.steps.forEach((step, at) => {
    const y = node.y + NODE_H + at * STEP_H;

    boxAt(grid, node.x + STEP_INSET, y, NODE_W - STEP_INSET * 2, STEP_H, 'rounded', frame);
    writeText(grid, node.x + STEP_INSET + 2, y + 1, '✓', theme.green);
    writeText(
      grid,
      node.x + STEP_INSET + 4,
      y + 1,
      trimmedTo(step.name, NODE_W - STEP_INSET * 2 - 6),
      theme.subtext,
    );
  });
}

function drawNode(
  grid: Cell[][],
  node: PlacedNode,
  border: Border,
  clock: Clock,
  theme: Theme,
): void {
  boxAt(grid, node.x, node.y, NODE_W, NODE_H, border.style, border.fg);
  drawSteps(grid, node, theme);

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

function panOf(center: number, view: number, size: number): number {
  return Math.floor(Math.min(Math.max(center - view / 2, 0), Math.max(0, size - view)));
}

export interface CanvasSpot {
  x: number;
  y: number;
}

interface Pans {
  panX: number;
  panY: number;
}

function pansOf(placed: Placed, selectedId: string, view: Viewport): Pans {
  const center = centerOf(placed.nodes.find((node) => node.id === selectedId));

  return {
    panX: panOf(center.x, view.width, placed.width),
    panY: panOf(center.y, view.height, placed.height),
  };
}

function holds(node: PlacedNode, x: number, y: number): boolean {
  return x >= node.x && x < node.x + NODE_W && y >= node.y && y < node.y + heightOf(node);
}

export function stageAt(
  journey: JourneyView,
  selectedId: string,
  view: Viewport,
  spot: CanvasSpot,
): string | undefined {
  const placed = placedOf(journey);
  const pans = pansOf(placed, selectedId, view);

  return placed.nodes.find((node) => holds(node, spot.x + pans.panX, spot.y + pans.panY))?.id;
}

export function overflowsAcross(journey: JourneyView, width: number): boolean {
  return placedOf(journey).width > width;
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

  const pans = pansOf(placed, selectedId, view);

  return grid
    .slice(pans.panY, pans.panY + view.height)
    .map((row) => spansOf(row.slice(pans.panX, pans.panX + view.width)));
}
