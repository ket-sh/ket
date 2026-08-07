import { describe, expect, it } from 'vitest';

import type { JourneyNodeView, JourneyView } from '../../../shared/model';

import { NODE_H, NODE_W, neighborOf, placedOf } from './layout.ts';

function nodeOf(id: string): JourneyNodeView {
  return {
    id,
    kind: 'stage',
    title: id,
    mark: 'done',
    at: undefined,
    child: undefined,
    doc: undefined,
  };
}

function journeyOf(ids: string[], edges: [string, string][]): JourneyView {
  return {
    item: 'K-1',
    title: 'The watched item',
    nodes: ids.map(nodeOf),
    edges,
    standing: undefined,
  };
}

describe('the places a chain takes', () => {
  it('walks a linear chain left to right on one row', () => {
    const placed = placedOf(journeyOf(['a', 'b'], [['a', 'b']]));

    expect(placed.nodes.map((node) => [node.id, node.x, node.y])).toStrictEqual([
      ['a', 2, 2],
      ['b', 31, 2],
    ]);
    expect(placed.width).toBe(55);
    expect(placed.height).toBe(NODE_H + 4);
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
      ['a', 2],
      ['b', 31],
      ['c', 60],
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
      ['root', 2, 4],
      ['s1', 31, 2],
      ['s2', 31, 7],
    ]);
    expect(placed.height).toBe(13);
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
  it('draws every node the same width and height', () => {
    expect(NODE_W).toBe(22);
    expect(NODE_H).toBe(4);
  });
});
