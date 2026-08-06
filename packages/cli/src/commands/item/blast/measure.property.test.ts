import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { collapseDepth, measureOf } from './measure.ts';

const somePaths = fc.array(
  fc
    .array(fc.constantFrom('a', 'b', 'c', 'd'), { minLength: 1, maxLength: 4 })
    .map((parts) => `${parts.join('/')}.ts`),
  { maxLength: 25 },
);

const someBudget = fc.integer({ min: 1, max: 8 });

function groupsAt(paths: string[], depth: number): number {
  return new Set(paths.map((path) => path.split('/').slice(0, depth).join('/'))).size;
}

describe('the invariants a collapse keeps', () => {
  it('collapses exactly when the graph exceeds the budget', () => {
    fc.assert(
      fc.property(somePaths, someBudget, (paths, budget) => {
        expect(collapseDepth(paths, budget) === undefined).toBe(new Set(paths).size <= budget);
      }),
    );
  });

  it('fits the budget at the chosen depth, or has reached the shallowest depth there is', () => {
    fc.assert(
      fc.property(somePaths, someBudget, (paths, budget) => {
        const chosen = collapseDepth(paths, budget);

        fc.pre(chosen !== undefined);
        expect(chosen === 1 || groupsAt(paths, chosen) <= budget).toBe(true);
      }),
    );
  });

  it('chooses the deepest depth that still fits', () => {
    fc.assert(
      fc.property(somePaths, someBudget, (paths, budget) => {
        const chosen = collapseDepth(paths, budget);

        fc.pre(chosen !== undefined);
        expect(groupsAt(paths, chosen + 1) > budget).toBe(true);
      }),
    );
  });
});

describe('the invariants a measure keeps', () => {
  it('echoes the graph it measured and collapses exactly when the budget demands it', () => {
    fc.assert(
      fc.property(somePaths, someBudget, fc.nat(), (paths, budget, edges) => {
        const measured = measureOf(
          { modules: paths, edges },
          { base: 'main', measuredAt: 'now', budget },
        );

        expect(measured.uncollapsedNodes).toBe(paths.length);
        expect(measured.uncollapsedEdges).toBe(edges);
        expect(measured.collapse === 0).toBe(new Set(paths).size <= budget);
      }),
    );
  });
});
