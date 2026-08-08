import { describe, expect, it } from 'vitest';

import type { RefusalCluster } from './friction.ts';
import type { RetroWindow } from './window.ts';

import { foldRetro } from './fold.ts';

const WINDOW: RetroWindow = {
  from: Date.parse('2026-08-03T00:00:00.000Z'),
  to: Date.parse('2026-08-08T12:00:00.000Z'),
};

const WORKING = [
  { key: 'K-1', contents: 'title: The fold\nkind: feature\nsize: story\nstatus: implementing\n' },
];

function turnedAway(gate: string, at: string, reason: string): string {
  return `${JSON.stringify({
    gate,
    outcome: 'refused',
    about: 'src/a.ts',
    item: 'K-1',
    at,
    reason,
  })}\n`;
}

function clustersOf(log: string) {
  return foldRetro(WORKING, log, WINDOW).clusters;
}

function held(gate: string, reason: string, moments: string[], items: string[]): RefusalCluster {
  return {
    gate,
    reason,
    count: moments.length,
    moments: moments.map((at) => Date.parse(at)),
    items,
  };
}

const TEST_FIRST = 'the test comes first';

describe('the refusals a window gathers', () => {
  it('counts a cluster for each gate and reason a refusal names', () => {
    const log =
      turnedAway('write', '2026-08-04T09:00:00.000Z', TEST_FIRST) +
      turnedAway('write', '2026-08-04T10:00:00.000Z', TEST_FIRST) +
      turnedAway('review', '2026-08-04T11:00:00.000Z', 'the design names no spec');

    expect(clustersOf(log)).toStrictEqual([
      held('write', TEST_FIRST, ['2026-08-04T09:00:00.000Z', '2026-08-04T10:00:00.000Z'], ['K-1']),
      held('review', 'the design names no spec', ['2026-08-04T11:00:00.000Z'], ['K-1']),
    ]);
  });

  it('splits one gate refusing for two reasons into two clusters, ordered by reason', () => {
    const log =
      turnedAway('write', '2026-08-04T09:00:00.000Z', TEST_FIRST) +
      turnedAway('write', '2026-08-04T10:00:00.000Z', 'a tool owns the lockfile');

    expect(clustersOf(log).map((cluster) => cluster.reason)).toStrictEqual([
      'a tool owns the lockfile',
      TEST_FIRST,
    ]);
  });

  it('names an item once, however many refusals it took', () => {
    const log =
      turnedAway('write', '2026-08-04T09:00:00.000Z', TEST_FIRST) +
      turnedAway('write', '2026-08-04T10:00:00.000Z', TEST_FIRST);

    expect(clustersOf(log).at(0)?.items).toStrictEqual(['K-1']);
  });

  it('leaves out a refusal that landed before the window opened', () => {
    expect(clustersOf(turnedAway('write', '2026-07-20T09:00:00.000Z', TEST_FIRST))).toStrictEqual(
      [],
    );
  });

  it('counts nothing from a gate that allowed the work through', () => {
    const allowed = `${JSON.stringify({
      gate: 'write',
      outcome: 'allowed',
      item: 'K-1',
      at: '2026-08-04T09:00:00.000Z',
    })}\n`;

    expect(clustersOf(allowed)).toStrictEqual([]);
  });
});

describe('the refusals a real log makes messy', () => {
  it('reads a refusal from a gate it has never heard of', () => {
    const log = turnedAway('chromatic', '2026-08-04T09:00:00.000Z', 'the snapshot drifted');

    expect(clustersOf(log)).toStrictEqual([
      held('chromatic', 'the snapshot drifted', ['2026-08-04T09:00:00.000Z'], ['K-1']),
    ]);
  });

  it('gathers refusals that named no gate under one honest label', () => {
    const log = `${JSON.stringify({
      outcome: 'refused',
      item: 'K-1',
      reason: TEST_FIRST,
      at: '2026-08-04T09:00:00.000Z',
    })}\n`;

    expect(clustersOf(log)).toStrictEqual([
      held('an unnamed gate', TEST_FIRST, ['2026-08-04T09:00:00.000Z'], ['K-1']),
    ]);
  });

  it('gathers refusals that named no reason under one honest label', () => {
    const log = `${JSON.stringify({
      gate: 'write',
      outcome: 'refused',
      item: 'K-1',
      at: '2026-08-04T09:00:00.000Z',
    })}\n`;

    expect(clustersOf(log)).toStrictEqual([
      held('write', 'no reason recorded', ['2026-08-04T09:00:00.000Z'], ['K-1']),
    ]);
  });

  it('reads a reason by its opening line, so one failure makes one cluster', () => {
    const log =
      turnedAway('transition', '2026-08-04T09:00:00.000Z', 'not verified yet.\n\nbun test\nAAA') +
      turnedAway('transition', '2026-08-04T10:00:00.000Z', 'not verified yet.\n\nbun test\nBBB');

    expect(clustersOf(log)).toStrictEqual([
      held(
        'transition',
        'not verified yet.',
        ['2026-08-04T09:00:00.000Z', '2026-08-04T10:00:00.000Z'],
        ['K-1'],
      ),
    ]);
  });
});

describe('a refusal that stopped work nobody filed', () => {
  it('counts a refusal that named no item, since a gate still stopped work', () => {
    const log = `${JSON.stringify({
      gate: 'shell',
      outcome: 'refused',
      reason: 'the rule reads the path',
      at: '2026-08-04T09:00:00.000Z',
    })}\n`;

    expect(clustersOf(log)).toStrictEqual([
      held('shell', 'the rule reads the path', ['2026-08-04T09:00:00.000Z'], []),
    ]);
  });
});

describe('the order the drafted actions rank in', () => {
  function firstClusterOf(log: string): RefusalCluster | undefined {
    const action = foldRetro(WORKING, log, WINDOW).actions.at(0);

    return action !== undefined && 'cluster' in action ? action.cluster : undefined;
  }

  it('ranks the cluster that fired most as the first action', () => {
    const log =
      turnedAway('review', '2026-08-04T08:00:00.000Z', 'the design names no spec') +
      turnedAway('write', '2026-08-04T09:00:00.000Z', TEST_FIRST) +
      turnedAway('write', '2026-08-04T10:00:00.000Z', TEST_FIRST);

    expect(firstClusterOf(log)).toStrictEqual(
      held('write', TEST_FIRST, ['2026-08-04T09:00:00.000Z', '2026-08-04T10:00:00.000Z'], ['K-1']),
    );
  });

  it('settles a tie on the gate name, so the same log always ranks the same way', () => {
    const log =
      turnedAway('write', '2026-08-04T09:00:00.000Z', TEST_FIRST) +
      turnedAway('review', '2026-08-04T10:00:00.000Z', 'the design names no spec');

    expect(firstClusterOf(log)).toStrictEqual(
      held('review', 'the design names no spec', ['2026-08-04T10:00:00.000Z'], ['K-1']),
    );
  });
});
