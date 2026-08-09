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

describe('the fold of an item the log never moved', () => {
  it('folds it to its status active and the rest ahead', () => {
    const journey = foldJourney(STORED, '', 'K-1');

    expect(journey?.nodes[0]).toStrictEqual({
      id: 'designing',
      title: 'designing',
      state: 'running',
      at: undefined,
      until: undefined,
      refusal: undefined,
      note: undefined,
      doc: undefined,
      steps: [],
    });
    expect(journey?.nodes.slice(1).map((node) => node.state)).toStrictEqual([
      'future',
      'future',
      'future',
      'future',
      'future',
    ]);
  });
});

describe('the stages a journey walks', () => {
  it('walks one node per visit, done behind the active one, the rest ahead', () => {
    const journey = foldJourney(STORED, WALKED, 'K-1');

    expect(journey?.nodes.map((node) => [node.id, node.state, node.at])).toStrictEqual([
      ['triaged', 'done', '2026-08-07T09:00:00.000Z'],
      ['designing', 'running', '2026-08-07T10:00:00.000Z'],
      ['awaiting-approval', 'future', undefined],
      ['implementing', 'future', undefined],
      ['verifying', 'future', undefined],
      ['awaiting-merge', 'future', undefined],
      ['shipped', 'future', undefined],
    ]);
    expect(journey?.edges.slice(0, 2)).toStrictEqual([
      ['triaged', 'designing'],
      ['designing', 'awaiting-approval'],
    ]);
  });

  it('gives a returning visit its own node', () => {
    const log =
      moved('K-1', 'designing', '2026-08-07T08:00:00.000Z') +
      moved('K-1', 'implementing', '2026-08-07T09:00:00.000Z') +
      moved('K-1', 'designing', '2026-08-07T10:00:00.000Z');

    expect(idsOf(foldJourney(STORED, log, 'K-1')).slice(0, 4)).toStrictEqual([
      'designing',
      'implementing',
      'designing#2',
      'awaiting-approval',
    ]);
  });
});

describe('the end of the machine path', () => {
  it('appends no stage past the end of the pipeline', () => {
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

    expect(idsOf(foldJourney(STORED, log, 'K-1')).slice(0, 3)).toStrictEqual([
      'triaged',
      'designing',
      'awaiting-approval',
    ]);
  });

  it('numbers a stage ahead that the journey already visited', () => {
    const log =
      moved('K-1', 'triaged', '2026-08-07T08:00:00.000Z') +
      moved('K-1', 'implementing', '2026-08-07T09:00:00.000Z') +
      moved('K-1', 'verifying', '2026-08-07T10:00:00.000Z') +
      moved('K-1', 'implementing', '2026-08-07T11:00:00.000Z');
    const journey = foldJourney(STORED, log, 'K-1');
    const ahead = journey?.nodes.find((node) => node.state === 'future');

    expect(ahead?.id).toBe('verifying#2');
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

  it('measures the refusal from the arrival it stands on, not an earlier one', () => {
    const log =
      WALKED +
      turnedAway('K-1', 'src/auth.ts', '2026-08-07T10:30:00.000Z', 'no failing test covers it') +
      moved('K-1', 'implementing', '2026-08-07T11:00:00.000Z');

    expect(foldJourney(STORED, log, 'K-1')?.standing).toBeUndefined();
  });
});
