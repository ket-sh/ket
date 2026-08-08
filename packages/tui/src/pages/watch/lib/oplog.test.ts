import { describe, expect, it } from 'vitest';

import type { OplogEventView } from '../../../shared/model';

import { gateOf, narrowedEvents, textOf } from './oplog.ts';

function eventOf(worn: Partial<OplogEventView>): OplogEventView {
  return {
    outcome: undefined,
    gate: undefined,
    about: undefined,
    item: undefined,
    reason: undefined,
    at: undefined,
    note: undefined,
    actor: undefined,
    ...worn,
  };
}

const REFUSED = eventOf({
  gate: 'write',
  outcome: 'refused',
  about: 'src/keeper.ts',
  reason: 'no failing test covers it',
  item: 'K-1',
});

const ARRIVED = eventOf({
  gate: 'transition',
  outcome: 'allowed',
  about: 'designing',
  item: 'K-11',
});

const NARRATED = eventOf({
  note: 'researching the breakdown',
  actor: 'decomposer',
  item: 'K-2',
});

const DECLARED = eventOf({ gate: 'lint', outcome: 'allowed', about: 'bun run lint' });

const ROWS = [DECLARED, NARRATED, REFUSED, ARRIVED];

function gatesKept(rows: OplogEventView[], query: string): (string | undefined)[] {
  return narrowedEvents(rows, query).map((row) => row.gate);
}

describe('the words a row shows for itself', () => {
  it('names the gate, and calls a note a note', () => {
    expect(gateOf(REFUSED)).toBe('write');
    expect(gateOf(NARRATED)).toBe('note');
  });

  it('speaks the reason first, then the about, then the note', () => {
    expect(textOf(REFUSED)).toBe('no failing test covers it');
    expect(textOf(ARRIVED)).toBe('designing');
    expect(textOf(NARRATED)).toBe('researching the breakdown');
    expect(textOf(eventOf({ gate: 'turn' }))).toBe('');
  });
});

describe('what a plain word narrows the log to', () => {
  it('keeps everything on an empty query', () => {
    expect(narrowedEvents(ROWS, '')).toStrictEqual(ROWS);
    expect(narrowedEvents(ROWS, '   ')).toStrictEqual(ROWS);
  });

  it('matches the reason whatever the case', () => {
    expect(gatesKept(ROWS, 'FAILING')).toStrictEqual(['write']);
  });

  it('matches the about of a run that gave no reason', () => {
    expect(gatesKept(ROWS, 'designing')).toStrictEqual(['transition']);
  });

  it('matches the note and the actor who spoke it', () => {
    expect(gatesKept(ROWS, 'breakdown')).toStrictEqual([undefined]);
    expect(gatesKept(ROWS, 'decomposer')).toStrictEqual([undefined]);
  });

  it('stacks the words so every one must match', () => {
    expect(gatesKept(ROWS, 'covers keeper')).toStrictEqual(['write']);
    expect(gatesKept(ROWS, 'covers designing')).toStrictEqual([]);
  });
});

describe('what the sigils narrow the log to', () => {
  it('keeps one gate through the g sigil, by prefix', () => {
    expect(gatesKept(ROWS, 'g:tr')).toStrictEqual(['transition']);
  });

  it('answers g:note with the notes', () => {
    expect(gatesKept(ROWS, 'g:note')).toStrictEqual([undefined]);
  });

  it('keeps one outcome through the o sigil, by prefix', () => {
    expect(gatesKept(ROWS, 'o:r')).toStrictEqual(['write']);
    expect(gatesKept(ROWS, 'o:allowed')).toStrictEqual(['lint', 'transition']);
  });

  it('keeps one item through the i sigil, by prefix', () => {
    expect(gatesKept(ROWS, 'i:k-2')).toStrictEqual([undefined]);
    expect(gatesKept(ROWS, 'i:k-1')).toStrictEqual(['write', 'transition']);
  });

  it('never answers an item sigil with a row that names no item', () => {
    expect(gatesKept(ROWS, 'i:')).toStrictEqual([undefined, 'write', 'transition']);
  });

  it('mixes sigils and words into one narrowing', () => {
    expect(gatesKept(ROWS, 'o:allowed run')).toStrictEqual(['lint']);
  });
});
