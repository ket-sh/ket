import { describe, expect, it } from 'vitest';

import { foldOplog } from './oplog.ts';

const DAY = '2026-08-07';

function at(hour: number): string {
  return `${DAY}T${String(hour).padStart(2, '0')}:00:00.000Z`;
}

const ARRIVED = `{"gate":"transition","outcome":"allowed","about":"designing","item":"K-1","at":"${at(9)}"}`;

const REFUSED = `{"gate":"write","outcome":"refused","about":"src/keeper.ts","reason":"no failing test covers it","item":"K-1","at":"${at(10)}"}`;

const NARRATED = `{"note":"researching the breakdown","actor":"decomposer","item":"K-2","at":"${at(11)}"}`;

const DECLARED = `{"gate":"lint","outcome":"allowed","about":"bun run lint","at":"${at(12)}"}`;

function logOf(lines: string[]): string {
  return `${lines.join('\n')}\n`;
}

describe('the rows the operation log folds into', () => {
  it('hands the events newest first', () => {
    const rows = foldOplog(logOf([ARRIVED, REFUSED, NARRATED, DECLARED]));

    expect(rows.map((row) => row.at)).toStrictEqual([at(12), at(11), at(10), at(9)]);
  });

  it('carries a refusal whole: gate, outcome, about, reason, and item', () => {
    const rows = foldOplog(logOf([REFUSED]));

    expect(rows).toStrictEqual([
      {
        gate: 'write',
        outcome: 'refused',
        about: 'src/keeper.ts',
        reason: 'no failing test covers it',
        item: 'K-1',
        at: at(10),
        note: undefined,
        actor: undefined,
        adopted: undefined,
      },
    ]);
  });

  it('carries a note with its actor and item', () => {
    const rows = foldOplog(logOf([NARRATED]));

    expect(rows[0]?.note).toBe('researching the breakdown');
    expect(rows[0]?.actor).toBe('decomposer');
    expect(rows[0]?.item).toBe('K-2');
    expect(rows[0]?.gate).toBeUndefined();
  });

  it('carries a declared gate run that names no item', () => {
    const rows = foldOplog(logOf([DECLARED]));

    expect(rows[0]?.gate).toBe('lint');
    expect(rows[0]?.item).toBeUndefined();
  });

  it('keeps an event that never said when it happened', () => {
    const rows = foldOplog(logOf(['{"gate":"turn"}', ARRIVED]));

    expect(rows.map((row) => row.gate)).toStrictEqual(['transition', 'turn']);
    expect(rows[1]?.at).toBeUndefined();
  });
});

describe('what the fold keeps out and how far back it reaches', () => {
  it('drops a line that is no event and a line that names no operation', () => {
    const rows = foldOplog(logOf(['not json', '{"whatever":1}', ARRIVED, '']));

    expect(rows.map((row) => row.gate)).toStrictEqual(['transition']);
  });

  it('folds an empty log into no rows', () => {
    expect(foldOplog('')).toStrictEqual([]);
  });

  it('keeps only the latest 500 of a longer history', () => {
    const crowd = Array.from(
      { length: 501 },
      (_, born) => `{"gate":"shell","outcome":"allowed","about":"run #${String(born)}"}`,
    );
    const rows = foldOplog(logOf(crowd));

    expect(rows).toHaveLength(500);
    expect(rows[0]?.about).toBe('run #500');
    expect(rows.at(-1)?.about).toBe('run #1');
  });
});
