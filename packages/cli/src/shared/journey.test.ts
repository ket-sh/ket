import { describe, expect, it } from 'vitest';

import type { Journey } from './journey.ts';

import { foldJourney } from './journey.ts';

function itemOf(status: string, children: string[] = []): string {
  const closing =
    children.length === 0
      ? 'children: []'
      : ['children:', ...children.map((child) => `  - ${child}`)].join('\n');

  return `title: The watched item\nkind: feature\nsize: story\nstatus: ${status}\n${closing}\n`;
}

function moved(item: string, to: string, at: string): string {
  return `${JSON.stringify({ gate: 'transition', outcome: 'allowed', about: to, item, at })}\n`;
}

function wrote(item: string, path: string, at: string): string {
  return `${JSON.stringify({ gate: 'write', outcome: 'allowed', about: path, item, at })}\n`;
}

function turnedAway(item: string, about: string, at: string, reason: string): string {
  return `${JSON.stringify({ gate: 'write', outcome: 'refused', about, item, at, reason })}\n`;
}

function heard(gate: string, outcome: string, about: string, at: string): string {
  return `${JSON.stringify({ gate, outcome, about, item: 'K-1', at })}\n`;
}

const STORED = [{ key: 'K-1', contents: itemOf('designing') }];

const WALKED =
  moved('K-1', 'triaged', '2026-08-07T09:00:00.000Z') +
  moved('K-1', 'designing', '2026-08-07T10:00:00.000Z');

describe('the journeys a fold refuses', () => {
  it('folds an unknown key to nothing', () => {
    expect(foldJourney(STORED, '', 'GONE-9')).toBeUndefined();
  });

  it('folds an unreadable manifest to nothing', () => {
    expect(foldJourney([{ key: 'K-1', contents: 'not yaml' }], '', 'K-1')).toBeUndefined();
  });
});

function idsOf(journey: Journey | undefined): string[] {
  return journey?.nodes.map((node) => node.id) ?? [];
}

describe('the name a journey answers to', () => {
  it('carries the key and the stored title', () => {
    const journey = foldJourney(STORED, '', 'K-1');

    expect(journey?.item).toBe('K-1');
    expect(journey?.title).toBe('The watched item');
  });
});

describe('the stages a journey walks', () => {
  it('folds an item without events to its status standing alone and active', () => {
    const journey = foldJourney(STORED, '', 'K-1');

    expect(journey?.nodes).toStrictEqual([
      {
        id: 'designing',
        kind: 'stage',
        title: 'designing',
        mark: 'active',
        at: undefined,
        until: undefined,
        child: undefined,
        doc: undefined,
      },
    ]);
    expect(journey?.edges).toStrictEqual([]);
  });

  it('walks one node per visit, done behind the active one, the next stage pending', () => {
    const journey = foldJourney(STORED, WALKED, 'K-1');

    expect(journey?.nodes.map((node) => [node.id, node.mark, node.at])).toStrictEqual([
      ['triaged', 'done', '2026-08-07T09:00:00.000Z'],
      ['designing', 'active', '2026-08-07T10:00:00.000Z'],
      ['awaiting-approval', 'pending', undefined],
    ]);
    expect(journey?.edges).toStrictEqual([
      ['triaged', 'designing'],
      ['designing', 'awaiting-approval'],
    ]);
  });

  it('gives a returning visit its own node', () => {
    const log =
      moved('K-1', 'designing', '2026-08-07T08:00:00.000Z') +
      moved('K-1', 'implementing', '2026-08-07T09:00:00.000Z') +
      moved('K-1', 'designing', '2026-08-07T10:00:00.000Z');

    expect(idsOf(foldJourney(STORED, log, 'K-1'))).toStrictEqual([
      'designing',
      'implementing',
      'designing#2',
      'awaiting-approval',
    ]);
  });

  it('appends no pending stage past the end of the pipeline', () => {
    const log = moved('K-1', 'shipped', '2026-08-07T10:00:00.000Z');
    const journey = foldJourney([{ key: 'K-1', contents: itemOf('shipped') }], log, 'K-1');

    expect(idsOf(journey)).toStrictEqual(['shipped']);
  });
});

describe('the visits a journey refuses to count', () => {
  it('reads visits from allowed transitions alone, never another gate or a refusal', () => {
    const log =
      WALKED +
      wrote('K-1', 'implementing', '2026-08-07T10:10:00.000Z') +
      heard('transition', 'refused', 'implementing', '2026-08-07T10:20:00.000Z');

    expect(idsOf(foldJourney(STORED, log, 'K-1'))).toStrictEqual([
      'triaged',
      'designing',
      'awaiting-approval',
    ]);
  });

  it('numbers a pending stage the journey already visited', () => {
    const log =
      moved('K-1', 'triaged', '2026-08-07T08:00:00.000Z') +
      moved('K-1', 'implementing', '2026-08-07T09:00:00.000Z') +
      moved('K-1', 'verifying', '2026-08-07T10:00:00.000Z') +
      moved('K-1', 'implementing', '2026-08-07T11:00:00.000Z');
    const journey = foldJourney(STORED, log, 'K-1');
    const pending = journey?.nodes.find((node) => node.mark === 'pending');

    expect(pending?.id).toBe('verifying#2');
  });
});

describe('the children a journey closes on', () => {
  it('fans the children out of the last visit, each wearing its own state', () => {
    const stored = [
      { key: 'K-1', contents: itemOf('designing', ['K-2', 'K-3']) },
      {
        key: 'K-2',
        contents: `title: A quiet fix\nkind: bug\nsize: subtask\nstatus: triaged\nchildren: []\n`,
      },
      {
        key: 'K-3',
        contents: `title: A done deed\nkind: chore\nsize: trivial\nstatus: shipped\nchildren: []\n`,
      },
    ];
    const log = WALKED + moved('K-2', 'triaged', '2026-08-07T10:30:00.000Z');
    const journey = foldJourney(stored, log, 'K-1');

    expect(journey?.nodes).toContainEqual({
      id: 'K-2',
      kind: 'child',
      title: 'K-2 A quiet fix',
      mark: 'active',
      at: '2026-08-07T10:30:00.000Z',
      child: 'K-2',
      doc: undefined,
    });
    expect(journey?.nodes).toContainEqual({
      id: 'K-3',
      kind: 'child',
      title: 'K-3 A done deed',
      mark: 'done',
      at: undefined,
      child: 'K-3',
      doc: undefined,
    });
    expect(journey?.edges).toContainEqual(['designing', 'K-2']);
    expect(journey?.edges).toContainEqual(['designing', 'K-3']);
  });

  it('marks a child still at the idea stage as pending', () => {
    const stored = [
      { key: 'K-1', contents: itemOf('designing', ['K-4']) },
      {
        key: 'K-4',
        contents: `title: A bare thought\nkind: feature\nsize: subtask\nstatus: idea\nchildren: []\n`,
      },
    ];
    const child = foldJourney(stored, WALKED, 'K-1')?.nodes.find((node) => node.id === 'K-4');

    expect(child?.mark).toBe('pending');
  });
});

describe('the refusal a journey wears', () => {
  it('wears the last refusal since the current arrival', () => {
    const log =
      WALKED +
      turnedAway('K-1', 'src/auth.ts', '2026-08-07T11:00:00.000Z', 'no failing test covers it');

    expect(foldJourney(STORED, log, 'K-1')?.standing).toBe('no failing test covers it');
  });

  it('drops a refusal the journey moved past', () => {
    const log =
      turnedAway('K-1', 'src/auth.ts', '2026-08-07T09:30:00.000Z', 'no failing test covers it') +
      WALKED;

    expect(foldJourney(STORED, log, 'K-1')?.standing).toBeUndefined();
  });
});
