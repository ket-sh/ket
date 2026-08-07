import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { sketchOf } from './sketch.ts';

const someName = fc.stringMatching(/^[a-z][a-z0-9]{0,6}$/);

const someLine = fc.oneof(
  fc.tuple(someName, fc.string()).map(([name, label]) => `${name}: ${label}`),
  fc.tuple(someName, someName).map(([from, to]) => `${from} -> ${to}`),
  fc
    .tuple(someName, someName, fc.string())
    .map(([from, to, label]) => `${from} -> ${to}: ${label}`),
  fc.string(),
);

const someSource = fc.array(someLine, { maxLength: 20 }).map((lines) => lines.join('\n'));

function nodeIds(source: string): Set<string> {
  return new Set(sketchOf(source).nodes.map((node) => node.id));
}

describe('the invariants a sketch keeps', () => {
  it('names every edge endpoint among the nodes, whatever the source', () => {
    fc.assert(
      fc.property(someSource, (source) => {
        const ids = nodeIds(source);

        for (const edge of sketchOf(source).edges) {
          expect(ids.has(edge.from)).toBe(true);
          expect(ids.has(edge.to)).toBe(true);
        }
      }),
    );
  });
});
