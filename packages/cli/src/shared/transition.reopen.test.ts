import { describe, expect, it } from 'vitest';

import type { Item } from './item.ts';

import { machineStepOf, reopeningOf } from './transition.ts';

const VERIFYING: Item = {
  title: 'login with lockout',
  kind: 'feature',
  size: 'story',
  status: 'verifying',
  parent: undefined,
  children: [],
};

const IMPLEMENTING: Item = { ...VERIFYING, status: 'implementing' };

describe('reopening work a review sent back', () => {
  it('moves a verifying item back to implementing', () => {
    expect(reopeningOf(VERIFYING)).toStrictEqual({ moved: IMPLEMENTING });
  });

  it('moves an item awaiting its merge back too, since a pull request review sends work back', () => {
    expect(reopeningOf({ ...VERIFYING, status: 'awaiting-merge' })).toStrictEqual({
      moved: IMPLEMENTING,
    });
  });

  it('keeps every other field, since a stage changes one thing', () => {
    const moved = reopeningOf({
      ...VERIFYING,
      size: 'epic',
      children: ['AUTH-2'],
      parent: 'AUTH-9',
    });

    expect(moved).toStrictEqual({
      moved: { ...IMPLEMENTING, size: 'epic', children: ['AUTH-2'], parent: 'AUTH-9' },
    });
  });
});

describe('refusing to reopen what nothing sent back', () => {
  it('refuses an item still implementing', () => {
    expect(reopeningOf(IMPLEMENTING)).toStrictEqual({ refused: 'already implementing' });
  });

  it('refuses a shipped item, since a defect found now files as its own item', () => {
    expect(reopeningOf({ ...VERIFYING, status: 'shipped' })).toStrictEqual({
      refused: 'already shipped, so a defect found now files as its own item',
    });
  });

  it('refuses everything the approve gate has not passed, saying why', () => {
    expect(reopeningOf({ ...VERIFYING, status: 'idea' })).toStrictEqual({
      refused: 'still an idea, so there is nothing to send back',
    });
    expect(reopeningOf({ ...VERIFYING, status: 'triaged' })).toStrictEqual({
      refused: 'not implemented yet, so there is nothing to send back',
    });
    expect(reopeningOf({ ...VERIFYING, status: 'designing' })).toStrictEqual({
      refused: 'still designing, so there is nothing to send back',
    });
    expect(reopeningOf({ ...VERIFYING, status: 'awaiting-approval' })).toStrictEqual({
      refused: 'awaiting approval, so there is nothing to send back',
    });
  });
});

describe('what the machine runs while reopen exists', () => {
  it('still names deliver at verifying, since reopen is a person sending work back', () => {
    expect(machineStepOf({ status: 'verifying', size: 'story' })).toBe('ket item deliver');
  });
});
