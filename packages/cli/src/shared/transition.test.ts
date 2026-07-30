import { describe, expect, it } from 'vitest';

import type { Item } from './item.ts';

import { approvalOf } from './transition.ts';

const TRIAGED: Item = {
  title: 'login with lockout',
  kind: 'feature',
  size: 'story',
  status: 'triaged',
  children: [],
};

describe('moving an item to implementing', () => {
  it('moves an item that finished design', () => {
    const moved = approvalOf({ ...TRIAGED, status: 'awaiting-approval' });

    expect(moved).toStrictEqual({ approved: { ...TRIAGED, status: 'implementing' } });
  });

  it('moves a triaged item too, until the design stage exists', () => {
    expect(approvalOf(TRIAGED)).toStrictEqual({
      approved: { ...TRIAGED, status: 'implementing' },
    });
  });

  it('keeps every other field, since approval changes one thing', () => {
    const moved = approvalOf({ ...TRIAGED, size: 'epic', children: ['AUTH-2'] });

    expect(moved).toStrictEqual({
      approved: {
        title: 'login with lockout',
        kind: 'feature',
        size: 'epic',
        status: 'implementing',
        children: ['AUTH-2'],
      },
    });
  });
});

describe('refusing an approval that would not be one', () => {
  it('refuses an item already implementing, so approval means something', () => {
    expect(approvalOf({ ...TRIAGED, status: 'implementing' })).toStrictEqual({
      refused: 'already implementing',
    });
  });

  it('refuses an item that shipped, since a downgrade needs a decision', () => {
    expect(approvalOf({ ...TRIAGED, status: 'shipped' })).toStrictEqual({
      refused: 'already shipped',
    });
  });

  it('refuses an idea, since nothing has triaged it yet', () => {
    expect(approvalOf({ ...TRIAGED, status: 'idea' })).toStrictEqual({
      refused: 'still an idea, so triage runs first',
    });
  });

  it('refuses an item still in design', () => {
    expect(approvalOf({ ...TRIAGED, status: 'designing' })).toStrictEqual({
      refused: 'still designing, so its artifacts are not written yet',
    });
  });

  it('refuses an item under verification, since that is not the way back', () => {
    expect(approvalOf({ ...TRIAGED, status: 'verifying' })).toStrictEqual({
      refused: 'already verifying',
    });
  });
});
