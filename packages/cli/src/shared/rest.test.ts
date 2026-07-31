import { describe, expect, it } from 'vitest';

import type { GovernedItem } from './write-gate.ts';

import { restEventFor } from './rest.ts';

const JOB: GovernedItem = {
  key: 'OS-1',
  kind: 'feature',
  size: 'story',
  status: 'implementing',
  children: [],
};

describe('a person telling ket to stop anyway', () => {
  it('records the stop against the stage the item stands at, with the reason given', () => {
    const outcome = restEventFor({ key: 'OS-1', reason: 'waiting on the customer', job: JOB });

    expect(outcome).toStrictEqual({
      gate: 'turn',
      outcome: 'skipped',
      about: 'OS-1 implementing',
      item: 'OS-1',
      reason: 'waiting on the customer',
    });
  });

  it('records the stage the item holds now, so moving it on asks the question again', () => {
    const outcome = restEventFor({
      key: 'OS-1',
      reason: 'waiting on the customer',
      job: { ...JOB, status: 'verifying' },
    });

    expect(outcome).toMatchObject({ about: 'OS-1 verifying' });
  });
});

describe('a stop nobody can weigh afterwards', () => {
  it('refuses an empty reason, since a stop nobody can see is no gate at all', () => {
    expect(restEventFor({ key: 'OS-1', reason: '', job: JOB })).toStrictEqual({
      refused: 'a deliberate stop records why. Pass --reason with what the work is waiting on.',
    });
  });

  it('refuses a reason that is only blank space', () => {
    expect(restEventFor({ key: 'OS-1', reason: '   ', job: JOB })).toStrictEqual({
      refused: 'a deliberate stop records why. Pass --reason with what the work is waiting on.',
    });
  });
});

describe('a stop recorded against work that is not in hand', () => {
  it('refuses where nothing is in flight, rather than recording a stop about nothing', () => {
    expect(restEventFor({ key: 'OS-1', reason: 'waiting', job: undefined })).toStrictEqual({
      refused: 'nothing is in flight, so there is no stop for OS-1 to record.',
    });
  });

  it('refuses a key that is not the item in flight, naming the one that is', () => {
    expect(restEventFor({ key: 'OS-9', reason: 'waiting', job: JOB })).toStrictEqual({
      refused: 'OS-1 is the item in flight, not OS-9.',
    });
  });

  it('answers about the item before the reason, since the wrong item makes the reason moot', () => {
    expect(restEventFor({ key: 'OS-9', reason: '', job: JOB })).toStrictEqual({
      refused: 'OS-1 is the item in flight, not OS-9.',
    });
  });
});
