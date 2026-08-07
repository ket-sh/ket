import type { JourneyNodeView, JourneyView } from '../../../shared/model';

export const NODE_W = 22;

export const NODE_H = 4;

const COLUMN_GAP = 7;

const ROW_GAP = 1;

const MARGIN = 2;

const STRIDE = NODE_H + ROW_GAP;

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

function lanesOf(journey: JourneyView, layers: Map<string, number>): Map<string, number> {
  const counts = new Map<number, number>();
  const lanes = new Map<string, number>();

  for (const node of journey.nodes) {
    const layer = layers.get(node.id) ?? 0;
    const lane = counts.get(layer) ?? 0;

    counts.set(layer, lane + 1);
    lanes.set(node.id, lane);
  }

  return lanes;
}

function tallestOf(layers: Map<string, number>): number {
  const counts = new Map<number, number>();

  for (const layer of layers.values()) {
    counts.set(layer, (counts.get(layer) ?? 0) + 1);
  }

  return Math.max(0, ...counts.values());
}

function layerCountsOf(layers: Map<string, number>): Map<number, number> {
  const counts = new Map<number, number>();

  for (const layer of layers.values()) {
    counts.set(layer, (counts.get(layer) ?? 0) + 1);
  }

  return counts;
}

export function placedOf(journey: JourneyView): Placed {
  if (journey.nodes.length === 0) {
    return { nodes: [], width: MARGIN * 2, height: MARGIN * 2 };
  }

  const layers = layersOf(journey);
  const lanes = lanesOf(journey, layers);
  const counts = layerCountsOf(layers);
  const tallestHeight = tallestOf(layers) * STRIDE - ROW_GAP;
  const nodes = journey.nodes.map((node) => {
    const layer = layers.get(node.id) ?? 0;
    const count = counts.get(layer) ?? 1;
    const offset = Math.floor((tallestHeight - (count * STRIDE - ROW_GAP)) / 2);

    return {
      ...node,
      x: MARGIN + layer * (NODE_W + COLUMN_GAP),
      y: MARGIN + offset + (lanes.get(node.id) ?? 0) * STRIDE,
    };
  });
  const lastLayer = Math.max(...layers.values());

  return {
    nodes,
    width: MARGIN * 2 + (lastLayer + 1) * (NODE_W + COLUMN_GAP) - COLUMN_GAP,
    height: MARGIN * 2 + tallestHeight,
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
