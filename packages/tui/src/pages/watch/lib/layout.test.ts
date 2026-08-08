import { describe, expect, it } from 'vitest';

import type { JourneyNodeView, JourneyPaneView, JourneyView } from '../../../shared/model';

const PANE: JourneyPaneView = {
  kind: 'feature',
  size: 'story',
  status: 'designing',
  stageAt: 3,
  stageOf: 8,
  parent: undefined,
  refusedTimes: 0,
  arrivedAt: undefined,
  lastEventAt: undefined,
  filed: undefined,
  branch: undefined,
};

import { NODE_H, NODE_W, neighborOf, placedOf } from './layout.ts';

const MARGIN = 2;

const COLUMN_GAP = 7;

const STRIDE = NODE_H + 1;

function columnAt(layer: number): number {
  return MARGIN + layer * (NODE_W + COLUMN_GAP);
}

function nodeOf(id: string): JourneyNodeView {
  return {
    id,
    title: id,
    state: 'done',
    refusal: undefined,
    at: undefined,
    until: undefined,
    doc: undefined,
  };
}

function journeyOf(ids: string[], edges: [string, string][]): JourneyView {
  return {
    item: 'K-1',
    title: 'The watched item',
    description: undefined,
    nodes: ids.map(nodeOf),
    edges,
    standing: undefined,
    artifacts: [],
    children: [],
    pane: PANE,
  };
}

describe('the places a chain takes', () => {
  it('walks a linear chain left to right on one row', () => {
    const placed = placedOf(journeyOf(['a', 'b'], [['a', 'b']]));

    expect(placed.nodes.map((node) => [node.id, node.x, node.y])).toStrictEqual([
      ['a', columnAt(0), MARGIN],
      ['b', columnAt(1), MARGIN],
    ]);
    expect(placed.width).toBe(MARGIN * 2 + NODE_W * 2 + COLUMN_GAP);
    expect(placed.height).toBe(NODE_H + MARGIN * 2);
  });

  it('lays a node on the layer of its longest approach', () => {
    const placed = placedOf(
      journeyOf(
        ['a', 'b', 'c'],
        [
          ['a', 'b'],
          ['a', 'c'],
          ['b', 'c'],
        ],
      ),
    );

    expect(placed.nodes.map((node) => [node.id, node.x])).toStrictEqual([
      ['a', columnAt(0)],
      ['b', columnAt(1)],
      ['c', columnAt(2)],
    ]);
  });

  it('places nothing without breaking on an empty journey', () => {
    const placed = placedOf(journeyOf([], []));

    expect(placed.nodes).toStrictEqual([]);
  });
});

describe('the fan a layer spreads', () => {
  const FANNED = journeyOf(
    ['root', 's1', 's2'],
    [
      ['root', 's1'],
      ['root', 's2'],
    ],
  );

  it('stacks fan members in one column and centers the thin layer', () => {
    const placed = placedOf(FANNED);

    expect(placed.nodes.map((node) => [node.id, node.x, node.y])).toStrictEqual([
      ['root', columnAt(0), MARGIN + Math.floor(STRIDE / 2)],
      ['s1', columnAt(1), MARGIN],
      ['s2', columnAt(1), MARGIN + STRIDE],
    ]);
    expect(placed.height).toBe(MARGIN * 2 + STRIDE * 2 - 1);
  });

  it('jumps to the nearest node in the pressed direction', () => {
    const placed = placedOf(FANNED).nodes;

    expect(neighborOf(placed, 'root', 'right')).toBe('s1');
    expect(neighborOf(placed, 's1', 'down')).toBe('s2');
    expect(neighborOf(placed, 's2', 'up')).toBe('s1');
    expect(neighborOf(placed, 's1', 'left')).toBe('root');
  });

  it('stays put at the edge of the graph', () => {
    const placed = placedOf(FANNED).nodes;

    expect(neighborOf(placed, 'root', 'left')).toBe('root');
    expect(neighborOf(placed, 'gone', 'left')).toBe('gone');
  });
});

describe('the sizes a node keeps', () => {
  it('gives every node room for its title, its state and how long it held', () => {
    expect(NODE_H).toBeGreaterThanOrEqual(5);
    expect(NODE_W - 4).toBeGreaterThanOrEqual('✗ Changes requested'.length);
  });
});
