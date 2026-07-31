import { describe, expect, it } from 'vitest';

import { reviewEventFor } from './review.ts';

describe('recording that a review answered for an item', () => {
  it('records a review that ran', () => {
    expect(reviewEventFor({ key: 'OS-1', reason: undefined })).toStrictEqual({
      gate: 'review',
      outcome: 'allowed',
      about: 'OS-1',
      item: 'OS-1',
    });
  });

  it('records a skip with the reason it was skipped for', () => {
    expect(reviewEventFor({ key: 'OS-1', reason: 'a one word typo fix' })).toStrictEqual({
      gate: 'review',
      outcome: 'skipped',
      about: 'OS-1',
      item: 'OS-1',
      reason: 'a one word typo fix',
    });
  });

  it('keeps the reason whole, since it is what a reader judges the skip by', () => {
    const recorded = reviewEventFor({ key: 'OS-1', reason: 'shipping under a deadline' });

    expect(recorded).toHaveProperty('reason', 'shipping under a deadline');
  });
});

describe('what a skip has to carry', () => {
  it('refuses a skip with no reason, since an unexplained skip is an invisible one', () => {
    expect(reviewEventFor({ key: 'OS-1', reason: '' })).toStrictEqual({
      refused: 'a skipped review records why. Pass --reason with what made it safe to skip.',
    });
  });

  it('refuses a reason that is only spaces', () => {
    expect(reviewEventFor({ key: 'OS-1', reason: '   ' })).toStrictEqual({
      refused: 'a skipped review records why. Pass --reason with what made it safe to skip.',
    });
  });
});
