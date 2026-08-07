import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import type { JourneyNodeView, JourneyView } from '../../../shared/model';

import { NODE_H, NODE_W, placedOf } from './layout.ts';

const someJourney = fc
  .integer({ min: 1, max: 9 })
  .chain((count) =>
    fc.record({
      count: fc.constant(count),
      picks: fc.array(
        fc.record({
          from: fc.integer({ min: 0, max: count - 1 }),
          to: fc.integer({ min: 0, max: count - 1 }),
        }),
        { maxLength: 12 },
      ),
    }),
  )
  .map(({ count, picks }) => {
    const nodes: JourneyNodeView[] = Array.from({ length: count }, (_, index) => ({
      id: `n${String(index)}`,
      kind: 'stage',
      title: `n${String(index)}`,
      mark: 'done',
      at: undefined,
      child: undefined,
      doc: undefined,
    }));
    const edges: [string, string][] = picks
      .filter((pick) => pick.from < pick.to)
      .map((pick) => [`n${String(pick.from)}`, `n${String(pick.to)}`]);

    return { item: 'K-1', title: 'Any', nodes, edges, standing: undefined } satisfies JourneyView;
  });

function placedIds(journey: JourneyView): Set<string> {
  return new Set(placedOf(journey).nodes.map((node) => node.id));
}

function overlapping(one: { x: number; y: number }, other: { x: number; y: number }): boolean {
  return (
    one.x < other.x + NODE_W &&
    other.x < one.x + NODE_W &&
    one.y < other.y + NODE_H &&
    other.y < one.y + NODE_H
  );
}

describe('the invariants a layout keeps', () => {
  it('never lets two boxes overlap, whatever the graph', () => {
    fc.assert(
      fc.property(someJourney, (journey) => {
        const placed = placedOf(journey).nodes;

        for (const [index, one] of placed.entries()) {
          for (const other of placed.slice(index + 1)) {
            expect(overlapping(one, other)).toBe(false);
          }
        }
      }),
    );
  });

  it('places every node an edge names, whatever the graph', () => {
    fc.assert(
      fc.property(someJourney, (journey) => {
        const placed = placedIds(journey);

        for (const [from, to] of journey.edges) {
          expect(placed.has(from)).toBe(true);
          expect(placed.has(to)).toBe(true);
        }
      }),
    );
  });
});
