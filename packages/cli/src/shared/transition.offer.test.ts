import { describe, expect, it } from 'vitest';

import type { Item, ItemSize, ItemStatus } from './item.ts';

import { offeredBy } from './transition.ts';

function itemAt(status: ItemStatus, size: ItemSize = 'story'): Item {
  return {
    title: 'The offered item',
    kind: 'feature',
    size,
    status,
    parent: undefined,
    children: [],
  };
}

describe('the gates an item offers', () => {
  it('offers approval where the item awaits it', () => {
    expect(offeredBy(itemAt('awaiting-approval'))).toStrictEqual(['approve']);
  });

  it('offers shipping and reopening where work awaits its merge', () => {
    expect(offeredBy(itemAt('awaiting-merge'))).toStrictEqual(['ship', 'reopen']);
  });

  it('offers only reopening while verification runs', () => {
    expect(offeredBy(itemAt('verifying'))).toStrictEqual(['reopen']);
  });

  it('offers nothing mid-implementation', () => {
    expect(offeredBy(itemAt('implementing'))).toStrictEqual([]);
  });

  it('offers approval to triaged work small enough to skip design', () => {
    expect(offeredBy(itemAt('triaged', 'subtask'))).toStrictEqual(['approve']);
  });

  it('offers nothing to triaged work that owes a design', () => {
    expect(offeredBy(itemAt('triaged'))).toStrictEqual([]);
  });
});
