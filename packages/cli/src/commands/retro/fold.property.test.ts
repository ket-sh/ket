import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import type { RetroWindow } from './window.ts';

import { foldRetro } from './fold.ts';
import { renderRetro } from './report.ts';

const WINDOW: RetroWindow = {
  from: Date.parse('2026-08-03T00:00:00.000Z'),
  to: Date.parse('2026-08-08T12:00:00.000Z'),
};

const AHEAD: RetroWindow = {
  from: Date.parse('2099-01-01T00:00:00.000Z'),
  to: Date.parse('2099-01-08T00:00:00.000Z'),
};

const WORKING = [
  { key: 'K-1', contents: 'title: The fold\nkind: feature\nsize: story\nstatus: implementing\n' },
];

interface Refusal {
  gate: string;
  reason: string;
  at: number;
}

const someRefusal = fc.record({
  gate: fc.constantFrom('write', 'shell', 'review', 'chromatic'),
  reason: fc.constantFrom('the test comes first', 'a tool owns the lockfile', 'no spec is named'),
  at: fc.integer({
    min: Date.parse('2026-07-27T00:00:00.000Z'),
    max: Date.parse('2026-08-15T00:00:00.000Z'),
  }),
});

const someRefusals = fc.array(someRefusal, { maxLength: 30 });

const someMoments = fc.uniqueArray(fc.integer({ min: WINDOW.from, max: WINDOW.to }), {
  minLength: 2,
  maxLength: 20,
});

function lineOf(refusal: Refusal): string {
  return `${JSON.stringify({
    gate: refusal.gate,
    outcome: 'refused',
    item: 'K-1',
    reason: refusal.reason,
    at: new Date(refusal.at).toISOString(),
  })}\n`;
}

function logOf(refusals: Refusal[]): string {
  return refusals.map((refusal) => lineOf(refusal)).join('');
}

function inWindow(refusals: Refusal[]): Refusal[] {
  return refusals.filter((refusal) => refusal.at >= WINDOW.from && refusal.at <= WINDOW.to);
}

function holdingBoth(refusal: Refusal): (cluster: { gate: string; reason: string }) => boolean {
  return (cluster) => cluster.gate === refusal.gate && cluster.reason === refusal.reason;
}

function clustersOnce(refusals: Refusal[]): void {
  const { clusters } = foldRetro(WORKING, logOf(refusals), WINDOW);

  for (const refusal of inWindow(refusals)) {
    expect(clusters.filter(holdingBoth(refusal))).toHaveLength(1);
  }
}

function countsAddUp(refusals: Refusal[]): void {
  const { clusters } = foldRetro(WORKING, logOf(refusals), WINDOW);

  expect(clusters.reduce((sum, cluster) => sum + cluster.count, 0)).toBe(inWindow(refusals).length);
}

function gapsAmong(moments: number[]): number[] {
  return moments.flatMap((at, index) => {
    const next = moments[index + 1];

    return next === undefined ? [] : [next - at];
  });
}

function coversEveryGap(moments: number[]): void {
  const sorted = [...moments].sort((one, next) => one - next);
  const refusals = sorted.map((at) => ({ gate: 'write', reason: 'no spec is named', at }));
  const { stall } = foldRetro(WORKING, logOf(refusals), WINDOW);
  const longest = stall?.span ?? 0;

  expect(gapsAmong(sorted).every((gap) => longest >= gap)).toBe(true);
}

function saysNothingHappened(refusals: Refusal[]): void {
  const report = renderRetro(foldRetro([], logOf(refusals), AHEAD));

  expect(report).not.toContain('- ');
  expect(report).not.toContain('## The one action');
}

describe('the invariants a retro keeps', () => {
  it('lands every refusal the window carries in exactly one cluster', () => {
    fc.assert(fc.property(someRefusals, clustersOnce));
  });

  it('adds the cluster counts up to the refusals the window carried', () => {
    fc.assert(fc.property(someRefusals, countsAddUp));
  });

  it('names a longest stall no shorter than any gap the window held', () => {
    fc.assert(fc.property(someMoments, coversEveryGap));
  });

  it('writes a report with no item line and no action when nothing landed', () => {
    fc.assert(fc.property(someRefusals, saysNothingHappened));
  });
});
