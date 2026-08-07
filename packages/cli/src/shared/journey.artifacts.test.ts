import { describe, expect, it } from 'vitest';

import { foldJourney } from './journey.ts';

function moved(item: string, to: string, at: string): string {
  return `${JSON.stringify({ gate: 'transition', outcome: 'allowed', about: to, item, at })}\n`;
}

function wrote(item: string, path: string, at?: string): string {
  return `${JSON.stringify({ gate: 'write', outcome: 'allowed', about: path, item, at })}\n`;
}

function turnedAway(item: string, about: string, at: string, reason: string): string {
  return `${JSON.stringify({ gate: 'write', outcome: 'refused', about, item, at, reason })}\n`;
}

function heard(gate: string, outcome: string, about: string, at: string): string {
  return `${JSON.stringify({ gate, outcome, about, item: 'K-1', at })}\n`;
}

const STORED = [
  {
    key: 'K-1',
    contents:
      'title: The watched item\nkind: feature\nsize: story\nstatus: designing\nchildren: []\n',
  },
];

const WALKED =
  moved('K-1', 'triaged', '2026-08-07T09:00:00.000Z') +
  moved('K-1', 'designing', '2026-08-07T10:00:00.000Z');

describe('the artifacts a journey hangs', () => {
  it('hangs an artifact on the stage that wrote it and joins it forward', () => {
    const log =
      WALKED + wrote('K-1', '.ket/items/K-1/solution-design.md', '2026-08-07T11:00:00.000Z');
    const journey = foldJourney(STORED, log, 'K-1');

    expect(journey?.nodes).toContainEqual({
      id: '.ket/items/K-1/solution-design.md',
      kind: 'artifact',
      title: 'solution-design.md',
      mark: 'done',
      at: '2026-08-07T11:00:00.000Z',
      child: undefined,
      doc: undefined,
    });
    expect(journey?.edges).toContainEqual(['designing', '.ket/items/K-1/solution-design.md']);
    expect(journey?.edges).toContainEqual([
      '.ket/items/K-1/solution-design.md',
      'awaiting-approval',
    ]);
  });

  it('keeps writes outside the item directory off the journey', () => {
    const log =
      WALKED +
      wrote('K-1', 'src/auth.ts', '2026-08-07T11:00:00.000Z') +
      wrote('K-1', '.ket/items/K-9/spec.md', '2026-08-07T11:30:00.000Z');

    expect(
      foldJourney(STORED, log, 'K-1')?.nodes.filter((node) => node.kind === 'artifact'),
    ).toStrictEqual([]);
  });

  it('folds repeated writes of one file to a single node dated last', () => {
    const log =
      WALKED +
      wrote('K-1', '.ket/items/K-1/spec.md', '2026-08-07T11:00:00.000Z') +
      wrote('K-1', '.ket/items/K-1/spec.md', '2026-08-07T12:00:00.000Z');
    const artifacts = foldJourney(STORED, log, 'K-1')?.nodes.filter(
      (node) => node.kind === 'artifact',
    );

    expect(artifacts).toHaveLength(1);
    expect(artifacts?.[0]?.at).toBe('2026-08-07T12:00:00.000Z');
  });
});

describe('the writes a journey refuses to hang', () => {
  it('hangs artifacts from allowed writes alone, never another gate or a refusal', () => {
    const log =
      WALKED +
      heard('transition', 'allowed', '.ket/items/K-1/sneak.md', '2026-08-07T10:10:00.000Z') +
      turnedAway('K-1', '.ket/items/K-1/rejected.md', '2026-08-07T10:20:00.000Z', 'not yours');

    expect(
      foldJourney(STORED, log, 'K-1')?.nodes.filter((node) => node.kind === 'artifact'),
    ).toStrictEqual([]);
  });

  it('hangs a write stamped exactly at an arrival on that very stage', () => {
    const log = WALKED + wrote('K-1', '.ket/items/K-1/spec.md', '2026-08-07T10:00:00.000Z');

    expect(foldJourney(STORED, log, 'K-1')?.edges).toContainEqual([
      'designing',
      '.ket/items/K-1/spec.md',
    ]);
  });
});

describe('the stage a write hangs on', () => {
  it('hangs on the stage standing when it happened, never a later one', () => {
    const log =
      WALKED +
      wrote('K-1', '.ket/items/K-1/spec.md', '2026-08-07T11:00:00.000Z') +
      moved('K-1', 'awaiting-approval', '2026-08-07T12:00:00.000Z');
    const edges = foldJourney(STORED, log, 'K-1')?.edges ?? [];

    expect(edges).toContainEqual(['designing', '.ket/items/K-1/spec.md']);
    expect(edges).not.toContainEqual(['awaiting-approval', '.ket/items/K-1/spec.md']);
  });

  it('hangs a write from before the first arrival on the first stage', () => {
    const log = WALKED + wrote('K-1', '.ket/items/K-1/spec.md', '2026-08-07T08:00:00.000Z');

    expect(foldJourney(STORED, log, 'K-1')?.edges).toContainEqual([
      'triaged',
      '.ket/items/K-1/spec.md',
    ]);
  });

  it('hangs an undated write on the latest dated stage', () => {
    const log = WALKED + wrote('K-1', '.ket/items/K-1/spec.md');

    expect(foldJourney(STORED, log, 'K-1')?.edges).toContainEqual([
      'designing',
      '.ket/items/K-1/spec.md',
    ]);
  });

  it('hangs an undated write on the bare status where nothing ever moved', () => {
    expect(
      foldJourney(STORED, wrote('K-1', '.ket/items/K-1/spec.md'), 'K-1')?.edges,
    ).toContainEqual(['designing', '.ket/items/K-1/spec.md']);
  });
});
