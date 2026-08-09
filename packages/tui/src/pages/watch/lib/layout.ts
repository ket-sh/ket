import type { JourneyNodeView, JourneyView } from '../../../shared/model';

export const NODE_W = 26;

export const NODE_H = 6;

export const STEP_H = 3;

const COLUMN_GAP = 7;

const ROW_GAP = 1;

const MARGIN = 2;

export function heightOf(node: JourneyNodeView): number {
  return NODE_H + node.steps.length * STEP_H;
}

export interface PlacedNode extends JourneyNodeView {
  x: number;
  y: number;
}

export interface Placed {
  nodes: PlacedNode[];
  width: number;
  height: number;
}

function liftedThrough(layer: Map<string, number>, edges: [string, string][]): void {
  for (const [from, to] of edges) {
    const held = layer.get(to);
    const source = layer.get(from);

    if (held === undefined || source === undefined) {
      continue;
    }

    layer.set(to, Math.max(held, source + 1));
  }
}

function layersOf(journey: JourneyView): Map<string, number> {
  const layer = new Map(journey.nodes.map((node) => [node.id, 0]));

  for (let pass = 0; pass < journey.nodes.length; pass += 1) {
    liftedThrough(layer, journey.edges);
  }

  return layer;
}

function stacksOf(
  journey: JourneyView,
  layers: Map<string, number>,
): Map<number, JourneyNodeView[]> {
  const stacks = new Map<number, JourneyNodeView[]>();

  for (const node of journey.nodes) {
    const layer = layers.get(node.id) ?? 0;

    stacks.set(layer, [...(stacks.get(layer) ?? []), node]);
  }

  return stacks;
}

function stackHeightOf(stack: JourneyNodeView[]): number {
  return stack.reduce((sum, node) => sum + heightOf(node), 0) + (stack.length - 1) * ROW_GAP;
}

function placedStack(stack: JourneyNodeView[], layer: number, tallest: number): PlacedNode[] {
  const offset = Math.floor((tallest - stackHeightOf(stack)) / 2);
  let y = MARGIN + offset;

  return stack.map((node) => {
    const placed = { ...node, x: MARGIN + layer * (NODE_W + COLUMN_GAP), y };

    y += heightOf(node) + ROW_GAP;

    return placed;
  });
}

export function placedOf(journey: JourneyView): Placed {
  if (journey.nodes.length === 0) {
    return { nodes: [], width: MARGIN * 2, height: MARGIN * 2 };
  }

  const layers = layersOf(journey);
  const stacks = stacksOf(journey, layers);
  const tallest = Math.max(...[...stacks.values()].map((stack) => stackHeightOf(stack)));
  const nodes = [...stacks.entries()].flatMap(([layer, stack]) =>
    placedStack(stack, layer, tallest),
  );
  const lastLayer = Math.max(...layers.values());

  return {
    nodes,
    width: MARGIN * 2 + (lastLayer + 1) * (NODE_W + COLUMN_GAP) - COLUMN_GAP,
    height: MARGIN * 2 + tallest,
  };
}

interface Reach {
  id: string;
  score: number;
}

type Direction = 'up' | 'down' | 'left' | 'right';

function aheadOf(dx: number, dy: number, direction: Direction): boolean {
  if (direction === 'right') {
    return dx > 0;
  }

  if (direction === 'left') {
    return dx < 0;
  }

  return direction === 'down' ? dy > 0 : dy < 0;
}

function reachOf(node: PlacedNode, from: PlacedNode, direction: Direction): Reach | undefined {
  const dx = node.x - from.x;
  const dy = (node.y - from.y) * 2;

  if (!aheadOf(dx, dy, direction)) {
    return undefined;
  }

  const sideways = direction === 'left' || direction === 'right';
  const along = sideways ? Math.abs(dx) : Math.abs(dy);
  const aside = sideways ? Math.abs(dy) : Math.abs(dx);

  return { id: node.id, score: along + aside * 3 };
}

export function neighborOf(
  nodes: PlacedNode[],
  selectedId: string,
  direction: 'up' | 'down' | 'left' | 'right',
): string {
  const from = nodes.find((node) => node.id === selectedId);

  if (from === undefined) {
    return selectedId;
  }

  const reachable = nodes
    .filter((node) => node.id !== selectedId)
    .flatMap((node) => {
      const reach = reachOf(node, from, direction);

      return reach === undefined ? [] : [reach];
    })
    .sort((one, other) => one.score - other.score);

  return reachable[0]?.id ?? selectedId;
}
