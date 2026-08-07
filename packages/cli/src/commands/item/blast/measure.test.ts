import { describe, expect, it } from 'vitest';

import { collapseDepth, graphOf, measureOf } from './measure.ts';

const CRUISE = JSON.stringify({
  modules: [
    { source: 'packages/cli/src/run.ts', dependencies: [{ resolved: 'packages/cli/src/main.ts' }] },
    { source: 'packages/cli/src/main.ts', dependencies: [] },
    { source: 'packages/preset/src/item.ts', dependencies: [] },
  ],
});

describe('reading the graph the cruiser saw', () => {
  it('reads every module and counts every edge', () => {
    expect(graphOf(CRUISE)).toStrictEqual({
      modules: [
        'packages/cli/src/run.ts',
        'packages/cli/src/main.ts',
        'packages/preset/src/item.ts',
      ],
      edges: 1,
    });
  });

  it('answers nothing for a document that is not JSON', () => {
    expect(graphOf('the cruiser said nothing')).toBeUndefined();
  });

  it('answers nothing for JSON that carries no module list', () => {
    expect(graphOf('{"summary": {}}')).toBeUndefined();
  });

  it('reads a module without a dependency list as a module without edges', () => {
    expect(graphOf('{"modules": [{"source": "a.ts"}]}')).toStrictEqual({
      modules: ['a.ts'],
      edges: 0,
    });
  });
});

describe('choosing the collapse depth', () => {
  it('collapses nothing when the graph already fits the budget', () => {
    expect(collapseDepth(['a/b.ts', 'a/c.ts'], 5)).toBeUndefined();
  });

  it('keeps the deepest folder depth that still fits the budget', () => {
    const paths = ['packages/cli/src/a.ts', 'packages/cli/src/b.ts', 'packages/preset/src/c.ts'];

    expect(collapseDepth(paths, 2)).toBe(3);
  });

  it('falls back to the shallowest depth when even that exceeds the budget', () => {
    expect(collapseDepth(['a/x.ts', 'b/y.ts', 'c/z.ts'], 2)).toBe(1);
  });

  it('groups by whole segments, never by the characters they happen to share', () => {
    expect(collapseDepth(['a/bc.ts', 'ab/c.ts'], 1)).toBe(1);
  });
});

describe('assembling the measure', () => {
  it('records what was measured, against what, and how it was made to fit', () => {
    const graph = {
      modules: ['packages/cli/src/a.ts', 'packages/cli/src/b.ts', 'packages/preset/src/c.ts'],
      edges: 2,
    };

    expect(
      measureOf(graph, { base: 'main', measuredAt: '2026-08-06T20:00:00Z', budget: 2 }),
    ).toStrictEqual({
      base: 'main',
      measuredAt: '2026-08-06T20:00:00Z',
      collapse: 3,
      budget: 2,
      uncollapsedNodes: 3,
      uncollapsedEdges: 2,
    });
  });

  it('records a collapse of zero when nothing needed collapsing', () => {
    const graph = { modules: ['a/b.ts'], edges: 0 };

    expect(measureOf(graph, { base: 'main', measuredAt: 'now', budget: 30 })).toStrictEqual({
      base: 'main',
      measuredAt: 'now',
      collapse: 0,
      budget: 30,
      uncollapsedNodes: 1,
      uncollapsedEdges: 0,
    });
  });
});
