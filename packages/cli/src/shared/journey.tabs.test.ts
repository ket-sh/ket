import { describe, expect, it } from 'vitest';

import { foldJourney } from './journey.ts';

function itemOf(title: string, status: string, children: string[] = []): string {
  const closing =
    children.length === 0
      ? 'children: []'
      : ['children:', ...children.map((child) => `  - ${child}`)].join('\n');

  return `title: ${title}\nkind: feature\nsize: story\nstatus: ${status}\n${closing}\n`;
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

const WALKED =
  moved('K-1', 'triaged', '2026-08-07T09:00:00.000Z') +
  moved('K-1', 'designing', '2026-08-07T10:00:00.000Z');

const ALONE = [{ key: 'K-1', contents: itemOf('The watched item', 'designing') }];

describe('the artifacts a journey hands to its tab', () => {
  it('carries each written artifact under the item, named by its basename', () => {
    const log = WALKED + wrote('K-1', '.ket/items/K-1/spec.md', '2026-08-07T10:30:00.000Z');
    const journey = foldJourney(ALONE, log, 'K-1');

    expect(journey?.artifacts).toStrictEqual([
      {
        path: '.ket/items/K-1/spec.md',
        name: 'spec.md',
        at: '2026-08-07T10:30:00.000Z',
        doc: undefined,
      },
    ]);
  });

  it('dates a rewritten artifact by its last writing and lists it once', () => {
    const log =
      WALKED +
      wrote('K-1', '.ket/items/K-1/spec.md', '2026-08-07T10:30:00.000Z') +
      wrote('K-1', '.ket/items/K-1/spec.md', '2026-08-07T11:00:00.000Z');
    const journey = foldJourney(ALONE, log, 'K-1');

    expect(journey?.artifacts).toHaveLength(1);
    expect(journey?.artifacts[0]?.at).toBe('2026-08-07T11:00:00.000Z');
  });

  it('leaves a file written outside the item off the tab', () => {
    const log =
      WALKED +
      wrote('K-1', 'src/auth.ts', '2026-08-07T10:30:00.000Z') +
      wrote('K-1', '.ket/items/K-9/spec.md', '2026-08-07T10:40:00.000Z');

    expect(foldJourney(ALONE, log, 'K-1')?.artifacts).toStrictEqual([]);
  });

  it('lists artifacts from allowed writes alone, never another gate or a refusal', () => {
    const log =
      WALKED +
      heard('transition', 'allowed', '.ket/items/K-1/sneak.md', '2026-08-07T10:10:00.000Z') +
      turnedAway('K-1', '.ket/items/K-1/rejected.md', '2026-08-07T10:20:00.000Z', 'not yours');

    expect(foldJourney(ALONE, log, 'K-1')?.artifacts).toStrictEqual([]);
  });

  it('lists an artifact the log never dated', () => {
    const log = `${WALKED}${JSON.stringify({
      gate: 'write',
      outcome: 'allowed',
      about: '.ket/items/K-1/spec.md',
      item: 'K-1',
    })}\n`;

    expect(foldJourney(ALONE, log, 'K-1')?.artifacts[0]?.at).toBeUndefined();
  });
});

describe('the children a journey hands to its tab', () => {
  it('carries a row per child wearing the state the board would show', () => {
    const stored = [
      { key: 'K-1', contents: itemOf('The watched item', 'designing', ['K-2']) },
      { key: 'K-2', contents: itemOf('A quiet fix', 'triaged') },
    ];
    const log = WALKED + moved('K-2', 'triaged', '2026-08-07T09:30:00.000Z');

    expect(foldJourney(stored, log, 'K-1')?.children).toStrictEqual([
      {
        key: 'K-2',
        title: 'A quiet fix',
        size: 'story',
        status: 'triaged',
        since: '2026-08-07T09:30:00.000Z',
        refusal: undefined,
      },
    ]);
  });

  it('wears a child standing refusal on its row', () => {
    const stored = [
      { key: 'K-1', contents: itemOf('The watched item', 'designing', ['K-2']) },
      { key: 'K-2', contents: itemOf('A quiet fix', 'triaged') },
    ];
    const log =
      WALKED +
      moved('K-2', 'triaged', '2026-08-07T09:30:00.000Z') +
      turnedAway('K-2', 'src/auth.ts', '2026-08-07T09:40:00.000Z', 'no failing test covers it');

    expect(foldJourney(stored, log, 'K-1')?.children[0]?.refusal).toStrictEqual({
      reason: 'no failing test covers it',
      at: '2026-08-07T09:40:00.000Z',
      gate: 'write',
    });
  });

  it('hands an item without children an empty tab', () => {
    expect(foldJourney(ALONE, WALKED, 'K-1')?.children).toStrictEqual([]);
  });
});
