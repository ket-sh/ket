import { describe, expect, it } from 'vitest';

import type { Item } from './item.ts';

import { approvalOf, designOf, submissionOf } from './transition.ts';

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

describe('opening the design stage', () => {
  it('moves a triaged item into design', () => {
    expect(designOf(TRIAGED)).toStrictEqual({ moved: DESIGNING });
  });

  it('opens design for an epic too, since decomposing is what it designs', () => {
    expect(designOf({ ...TRIAGED, size: 'epic' })).toStrictEqual({
      moved: { ...DESIGNING, size: 'epic' },
    });
  });

  it('keeps every other field, since a stage changes one thing', () => {
    const moved = designOf({ ...TRIAGED, size: 'epic', children: ['AUTH-2'], parent: 'AUTH-9' });

    expect(moved).toStrictEqual({
      moved: {
        title: 'login with lockout',
        kind: 'feature',
        size: 'epic',
        status: 'designing',
        parent: 'AUTH-9',
        children: ['AUTH-2'],
      },
    });
  });
});

describe('refusing to open a design stage twice', () => {
  it('refuses an item already designing', () => {
    expect(designOf(DESIGNING)).toStrictEqual({ refused: 'already designing' });
  });

  it('refuses an item whose design is already waiting on a person', () => {
    expect(designOf(AWAITING)).toStrictEqual({
      refused: 'already designed, so approval comes next',
    });
  });

  it('refuses an idea, since nothing has triaged it yet', () => {
    expect(designOf({ ...TRIAGED, status: 'idea' })).toStrictEqual({
      refused: 'still an idea, so triage runs first',
    });
  });

  it('refuses an item already implementing, since design does not reopen', () => {
    expect(designOf({ ...TRIAGED, status: 'implementing' })).toStrictEqual({
      refused: 'already implementing',
    });
  });

  it('refuses an item under verification', () => {
    expect(designOf({ ...TRIAGED, status: 'verifying' })).toStrictEqual({
      refused: 'already verifying',
    });
  });

  it('refuses an item that shipped', () => {
    expect(designOf({ ...TRIAGED, status: 'shipped' })).toStrictEqual({
      refused: 'already shipped',
    });
  });
});

describe('handing a finished design to the person who approves it', () => {
  it('moves a designing item to awaiting approval', () => {
    expect(submissionOf(DESIGNING)).toStrictEqual({ moved: AWAITING });
  });

  it('keeps every other field, since a stage changes one thing', () => {
    const moved = submissionOf({ ...DESIGNING, children: ['AUTH-2'] });

    expect(moved).toStrictEqual({ moved: { ...AWAITING, children: ['AUTH-2'] } });
  });
});

describe('refusing to submit what was never designed', () => {
  it('refuses a triaged item, since design runs before approval is asked for', () => {
    expect(submissionOf(TRIAGED)).toStrictEqual({
      refused: 'not designed yet, so design runs first',
    });
  });

  it('refuses an item already waiting on that person', () => {
    expect(submissionOf(AWAITING)).toStrictEqual({ refused: 'already awaiting approval' });
  });

  it('refuses an idea, since nothing has triaged it yet', () => {
    expect(submissionOf({ ...TRIAGED, status: 'idea' })).toStrictEqual({
      refused: 'still an idea, so triage runs first',
    });
  });

  it('refuses an item already implementing', () => {
    expect(submissionOf({ ...TRIAGED, status: 'implementing' })).toStrictEqual({
      refused: 'already implementing',
    });
  });

  it('refuses an item under verification', () => {
    expect(submissionOf({ ...TRIAGED, status: 'verifying' })).toStrictEqual({
      refused: 'already verifying',
    });
  });

  it('refuses an item that shipped', () => {
    expect(submissionOf({ ...TRIAGED, status: 'shipped' })).toStrictEqual({
      refused: 'already shipped',
    });
  });
});

describe('moving an item to implementing', () => {
  it('moves an item that finished design', () => {
    expect(approvalOf(AWAITING)).toStrictEqual({ moved: { ...TRIAGED, status: 'implementing' } });
  });

  it('keeps every other field, since approval changes one thing', () => {
    const moved = approvalOf({ ...AWAITING, size: 'epic', children: ['AUTH-2'] });

    expect(moved).toStrictEqual({
      moved: {
        title: 'login with lockout',
        kind: 'feature',
        size: 'epic',
        status: 'implementing',
        parent: undefined,
        children: ['AUTH-2'],
      },
    });
  });
});

describe('work small enough that design would be ceremony', () => {
  it('approves a triaged trivial item, since a unit test is the whole design', () => {
    const trivial: Item = { ...TRIAGED, size: 'trivial' };

    expect(approvalOf(trivial)).toStrictEqual({ moved: { ...trivial, status: 'implementing' } });
  });

  it('approves a triaged subtask, since its layer is already decided', () => {
    const subtask: Item = { ...TRIAGED, size: 'subtask' };

    expect(approvalOf(subtask)).toStrictEqual({ moved: { ...subtask, status: 'implementing' } });
  });
});

describe('work too big to approve without a design', () => {
  it('refuses a triaged story, since a story spans more than one slice', () => {
    expect(approvalOf(TRIAGED)).toStrictEqual({
      refused: 'not designed yet, and story work does not skip design',
    });
  });

  it('refuses a triaged epic, since an epic has to be broken down first', () => {
    expect(approvalOf({ ...TRIAGED, size: 'epic' })).toStrictEqual({
      refused: 'not designed yet, and epic work does not skip design',
    });
  });

  it('approves that same story once its design has been submitted', () => {
    expect(approvalOf(AWAITING)).toStrictEqual({ moved: { ...TRIAGED, status: 'implementing' } });
  });
});

describe('refusing an approval that would not be one', () => {
  it('refuses an item still in design, since its artifacts are unfinished', () => {
    expect(approvalOf(DESIGNING)).toStrictEqual({
      refused: 'still designing, so its artifacts are not written yet',
    });
  });

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

  it('refuses an item under verification, since that is not the way back', () => {
    expect(approvalOf({ ...TRIAGED, status: 'verifying' })).toStrictEqual({
      refused: 'already verifying',
    });
  });

  it('refuses an idea no matter how small it is, since triage names the size', () => {
    expect(approvalOf({ ...TRIAGED, status: 'idea', size: 'trivial' })).toStrictEqual({
      refused: 'still an idea, so triage runs first',
    });
  });
});
