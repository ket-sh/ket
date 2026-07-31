import { describe, expect, it } from 'vitest';

import type { Item } from './item.ts';
import type { RingFailure } from './ring.ts';

import { deliveryOf, shipmentOf, verificationOf } from './transition.ts';

const TRIAGED: Item = {
  title: 'login with lockout',
  kind: 'feature',
  size: 'story',
  status: 'triaged',
  parent: undefined,
  children: [],
};

const DESIGNING: Item = { ...TRIAGED, status: 'designing' };

const AWAITING: Item = { ...TRIAGED, status: 'awaiting-approval' };

const IMPLEMENTING: Item = { ...TRIAGED, status: 'implementing' };

const VERIFYING: Item = { ...TRIAGED, status: 'verifying' };

const AWAITING_MERGE: Item = { ...TRIAGED, status: 'awaiting-merge' };

const PASSED: RingFailure[] = [];

const TYPES_BROKE: RingFailure[] = [
  { runs: 'tsc --noEmit -p tsconfig.json', said: 'src/auth.ts(3,1): error TS2322' },
];

const MUTANTS_LIVED: RingFailure[] = [
  { runs: 'stryker run', said: 'Mutation score 87.50 under threshold 90' },
];

describe('opening verification on work that is built', () => {
  it('moves an implementing item to verifying once the project checks pass', () => {
    expect(verificationOf(IMPLEMENTING, PASSED)).toStrictEqual({ moved: VERIFYING });
  });

  it('keeps every other field, since a stage changes one thing', () => {
    const moved = verificationOf({ ...IMPLEMENTING, size: 'epic', parent: 'AUTH-9' }, PASSED);

    expect(moved).toStrictEqual({
      moved: { ...VERIFYING, size: 'epic', parent: 'AUTH-9' },
    });
  });
});

describe('work the project checks still refuse', () => {
  it('refuses when a check failed, naming it and what it said', () => {
    expect(verificationOf(IMPLEMENTING, TYPES_BROKE)).toStrictEqual({
      refused:
        'not ready to verify.\n\ntsc --noEmit -p tsconfig.json\nsrc/auth.ts(3,1): error TS2322',
    });
  });

  it('names every check that failed, not only the first', () => {
    const refusal = verificationOf(IMPLEMENTING, [
      { runs: 'tsc', said: 'a' },
      { runs: 'depcruise', said: 'b' },
    ]);

    expect(refusal).toStrictEqual({
      refused: 'not ready to verify.\n\ntsc\na\n\ndepcruise\nb',
    });
  });

  it('answers about the status first, since a check on unapproved work means nothing', () => {
    expect(verificationOf(DESIGNING, TYPES_BROKE)).toStrictEqual({
      refused: 'still designing, so there is nothing to verify',
    });
  });
});

describe('refusing to open verification out of turn', () => {
  it('refuses an idea, since nothing has triaged it yet', () => {
    expect(verificationOf({ ...TRIAGED, status: 'idea' }, PASSED)).toStrictEqual({
      refused: 'still an idea, so triage runs first',
    });
  });

  it('refuses a triaged item, since nothing has been built', () => {
    expect(verificationOf(TRIAGED, PASSED)).toStrictEqual({
      refused: 'not implementing yet, so approval runs first',
    });
  });

  it('refuses an item still waiting on approval', () => {
    expect(verificationOf(AWAITING, PASSED)).toStrictEqual({
      refused: 'awaiting approval, so there is nothing to verify',
    });
  });

  it('refuses an item already verifying', () => {
    expect(verificationOf(VERIFYING, PASSED)).toStrictEqual({ refused: 'already verifying' });
  });

  it('refuses an item that is already through verification', () => {
    expect(verificationOf(AWAITING_MERGE, PASSED)).toStrictEqual({
      refused: 'already verified, so the merge comes next',
    });
  });

  it('refuses an item that shipped', () => {
    expect(verificationOf({ ...TRIAGED, status: 'shipped' }, PASSED)).toStrictEqual({
      refused: 'already shipped',
    });
  });
});

describe('handing verified work to the person who merges it', () => {
  it('moves a verifying item to awaiting merge once mutation passes', () => {
    expect(deliveryOf(VERIFYING, PASSED)).toStrictEqual({ moved: AWAITING_MERGE });
  });

  it('keeps every other field, since a stage changes one thing', () => {
    const moved = deliveryOf({ ...VERIFYING, children: ['AUTH-2'] }, PASSED);

    expect(moved).toStrictEqual({ moved: { ...AWAITING_MERGE, children: ['AUTH-2'] } });
  });

  it('refuses while a mutant survives, naming the score the gate read', () => {
    expect(deliveryOf(VERIFYING, MUTANTS_LIVED)).toStrictEqual({
      refused: 'not verified yet.\n\nstryker run\nMutation score 87.50 under threshold 90',
    });
  });

  it('answers about the status first, since mutation on work nobody built says nothing', () => {
    expect(deliveryOf(TRIAGED, MUTANTS_LIVED)).toStrictEqual({
      refused: 'not verified yet, so implementation runs first',
    });
  });
});

describe('refusing to hand over what verification never passed', () => {
  it('refuses an idea, since nothing has triaged it yet', () => {
    expect(deliveryOf({ ...TRIAGED, status: 'idea' }, PASSED)).toStrictEqual({
      refused: 'still an idea, so triage runs first',
    });
  });

  it('refuses an item still designing', () => {
    expect(deliveryOf(DESIGNING, PASSED)).toStrictEqual({
      refused: 'still designing, so nothing is verified',
    });
  });

  it('refuses an item still waiting on approval', () => {
    expect(deliveryOf(AWAITING, PASSED)).toStrictEqual({
      refused: 'awaiting approval, so nothing is verified',
    });
  });

  it('refuses an item still implementing, since verification opens first', () => {
    expect(deliveryOf(IMPLEMENTING, PASSED)).toStrictEqual({
      refused: 'still implementing, so verification runs first',
    });
  });

  it('refuses an item already waiting on that merge', () => {
    expect(deliveryOf(AWAITING_MERGE, PASSED)).toStrictEqual({ refused: 'already awaiting merge' });
  });

  it('refuses an item that shipped', () => {
    expect(deliveryOf({ ...TRIAGED, status: 'shipped' }, PASSED)).toStrictEqual({
      refused: 'already shipped',
    });
  });
});

describe('recording that the work merged', () => {
  it('ships an item that was waiting on the merge', () => {
    expect(shipmentOf(AWAITING_MERGE)).toStrictEqual({
      moved: { ...TRIAGED, status: 'shipped' },
    });
  });

  it('keeps every other field, since shipping changes one thing', () => {
    const moved = shipmentOf({ ...AWAITING_MERGE, size: 'epic', children: ['AUTH-2'] });

    expect(moved).toStrictEqual({
      moved: { ...TRIAGED, status: 'shipped', size: 'epic', children: ['AUTH-2'] },
    });
  });
});

describe('refusing to ship what never reached a merge', () => {
  it('refuses an idea, since nothing has triaged it yet', () => {
    expect(shipmentOf({ ...TRIAGED, status: 'idea' })).toStrictEqual({
      refused: 'still an idea, so triage runs first',
    });
  });

  it('refuses a triaged item, since nothing has merged', () => {
    expect(shipmentOf(TRIAGED)).toStrictEqual({
      refused: 'not implemented yet, so nothing has merged',
    });
  });

  it('refuses an item still designing', () => {
    expect(shipmentOf(DESIGNING)).toStrictEqual({
      refused: 'still designing, so nothing has merged',
    });
  });

  it('refuses an item still waiting on approval', () => {
    expect(shipmentOf(AWAITING)).toStrictEqual({
      refused: 'awaiting approval, so nothing has merged',
    });
  });

  it('refuses an item still implementing, since verification opens first', () => {
    expect(shipmentOf(IMPLEMENTING)).toStrictEqual({
      refused: 'still implementing, so verification runs first',
    });
  });

  it('refuses an item still verifying, since the mutation gate comes first', () => {
    expect(shipmentOf(VERIFYING)).toStrictEqual({
      refused: 'still verifying, so the mutation gate runs first',
    });
  });

  it('refuses an item that already shipped', () => {
    expect(shipmentOf({ ...TRIAGED, status: 'shipped' })).toStrictEqual({
      refused: 'already shipped',
    });
  });
});
