import { describe, expect, it } from 'vitest';

import type { GovernedItem, WriteAttempt } from './write-gate.ts';

import { verdictFor, workingFrom } from './write-gate.ts';

const EPIC: GovernedItem = {
  key: 'AUTH-1',
  kind: 'feature',
  size: 'epic',
  status: 'designing',
  children: ['AUTH-2'],
};

const CHILD: GovernedItem = {
  key: 'AUTH-2',
  kind: 'feature',
  size: 'story',
  status: 'implementing',
  children: [],
};

function attempt(inFlight: GovernedItem[]): WriteAttempt {
  return {
    path: 'src/auth.ts',
    sources: ['src'],
    adapters: ['src/commands/*/command.ts'],
    inFlight,
  };
}

describe('an epic and the child it fanned out into', () => {
  it('is one job, since the epic stands for the child rather than beside it', () => {
    expect(verdictFor(attempt([EPIC, CHILD]))).toStrictEqual({ allowed: true });
  });

  it('is governed by the child, so the status of the child decides the write', () => {
    const verdict = verdictFor(attempt([EPIC, { ...CHILD, status: 'awaiting-approval' }]));

    expect(verdict).toStrictEqual({
      refused: 'AUTH-2 is awaiting-approval, not implementing. Approval comes before source.',
    });
  });

  it('is governed by the classification of the child, not that of the epic', () => {
    const verdict = verdictFor({
      ...attempt([EPIC, { ...CHILD, size: 'trivial' }]),
      path: 'src/commands/create/command.ts',
    });

    expect(verdict).toStrictEqual({
      refused:
        'AUTH-2 is trivial, and src/commands/create/command.ts is an adapter. It was never trivial, so triage runs again.',
    });
  });

  it('is governed by the epic again once its children have left flight', () => {
    expect(verdictFor(attempt([EPIC]))).toStrictEqual({
      refused: 'AUTH-1 is designing, not implementing. Approval comes before source.',
    });
  });

  it('is two jobs when the epic fanned out into two children at once', () => {
    const verdict = verdictFor(
      attempt([{ ...EPIC, children: ['AUTH-2', 'AUTH-3'] }, CHILD, { ...CHILD, key: 'AUTH-3' }]),
    );

    expect(verdict).toStrictEqual({
      refused: 'AUTH-2 and AUTH-3 are both in flight. One job means one branch.',
    });
  });
});

describe('the item a gate treats as the job in hand', () => {
  it('is the child rather than the epic that delegates to it', () => {
    expect(workingFrom([EPIC, CHILD]).map((item) => item.key)).toStrictEqual(['AUTH-2']);
  });

  it('is the epic itself when every child of it is somewhere else', () => {
    expect(workingFrom([EPIC]).map((item) => item.key)).toStrictEqual(['AUTH-1']);
  });

  it('is an item that lists itself among its children, since it delegates to nobody', () => {
    const looping: GovernedItem = { ...CHILD, key: 'AUTH-1', children: ['AUTH-1'] };

    expect(workingFrom([looping]).map((item) => item.key)).toStrictEqual(['AUTH-1']);
  });

  it('is every item when no one of them names another as a child', () => {
    const keys = workingFrom([{ ...CHILD, key: 'AUTH-1' }, CHILD]).map((item) => item.key);

    expect(keys).toStrictEqual(['AUTH-1', 'AUTH-2']);
  });
});
