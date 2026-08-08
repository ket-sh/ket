import type { GateSemantics } from '@ket/preset';

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import type { RetroWindow } from './window.ts';

import { titleRefusal } from '../../shared/item.ts';
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
  expect(report).not.toContain('Draft');
}

const GATE_POOL = ['check-types', 'lint', 'lint:dup', 'review', 'write'];

const someScripts = fc.subarray(GATE_POOL);

const someSightings = fc.subarray(GATE_POOL);

const MOVED = `${JSON.stringify({
  gate: 'transition',
  outcome: 'allowed',
  about: 'triaged',
  item: 'K-1',
  at: '2026-08-04T09:00:00.000Z',
})}\n`;

function gateOf(script: string): GateSemantics {
  return { script, guards: `It guards ${script}.`, commitJob: script, ciJob: 'check' };
}

function allowed(gate: string): string {
  return `${JSON.stringify({
    gate,
    outcome: 'allowed',
    item: 'K-1',
    at: '2026-08-05T09:00:00.000Z',
  })}\n`;
}

function numbersDensely(refusals: Refusal[], scripts: string[]): void {
  const folded = foldRetro(WORKING, MOVED + logOf(refusals), WINDOW, scripts.map(gateOf));

  expect(folded.actions.map((action) => action.draft.number)).toStrictEqual(
    Array.from({ length: folded.actions.length }, (_, held) => held + 1),
  );

  if (folded.clusters.length > 0) {
    expect(folded.actions).toHaveLength(folded.clusters.length);
  } else {
    expect(folded.actions.length).toBeLessThanOrEqual(1);
  }
}

function draftsTheSameTwice(refusals: Refusal[], scripts: string[]): void {
  const log = MOVED + logOf(refusals);
  const gates = scripts.map(gateOf);

  expect(foldRetro(WORKING, log, WINDOW, gates).actions).toStrictEqual(
    foldRetro(WORKING, log, WINDOW, gates).actions,
  );
}

function writesSentencesThatStandAsTitles(refusals: Refusal[], scripts: string[]): void {
  const folded = foldRetro(WORKING, MOVED + logOf(refusals), WINDOW, scripts.map(gateOf));

  for (const action of folded.actions) {
    expect(titleRefusal(action.draft.sentence)).toBeUndefined();
  }
}

function quietGateIn(log: string, scripts: string[]): string | undefined {
  const action = foldRetro(WORKING, log, WINDOW, scripts.map(gateOf)).actions.at(0);

  return action !== undefined && 'dormant' in action ? action.dormant.gate : undefined;
}

function namesNoGateTheWindowRecorded(scripts: string[], sighted: string[]): void {
  const log = MOVED + sighted.map((gate) => allowed(gate)).join('');
  const quiet = quietGateIn(log, scripts);

  expect(sighted).not.toContain(quiet);
  expect(quiet === undefined).toBe(scripts.every((script) => sighted.includes(script)));
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

  it('numbers a draft for every action, densely from one, in report order', () => {
    fc.assert(fc.property(someRefusals, someScripts, numbersDensely));
  });

  it('folds the same log into the same drafts, however often it folds', () => {
    fc.assert(fc.property(someRefusals, someScripts, draftsTheSameTwice));
  });

  it('writes draft sentences that stand as one-line item titles', () => {
    fc.assert(fc.property(someRefusals, someScripts, writesSentencesThatStandAsTitles));
  });

  it('calls a gate quiet only when the window recorded nothing from it', () => {
    fc.assert(fc.property(someScripts, someSightings, namesNoGateTheWindowRecorded));
  });
});
