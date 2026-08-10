import { describe, expect, it } from 'vitest';

import type { StoryMap } from '../../shared/story-map/schema.ts';

import { unfiledShelfOf } from './shelf.ts';

const SKELETON = {
  id: 'r-skeleton',
  name: 'walking skeleton',
  outcome: 'a shopper completes one real purchase',
  metric: 'one paid order lands in the ledger',
};

const NEXT = {
  id: 'r-next',
  name: 'the next cut',
  outcome: 'a shopper comes back',
  metric: 'a second order from one shopper',
};

const MAP: StoryMap = {
  version: 1,
  product: { name: 'shop', idea: 'a place to buy a thing' },
  users: [],
  releases: [SKELETON, NEXT],
  activities: [
    {
      id: 'a-buy',
      name: 'buy a thing',
      steps: [
        {
          id: 's-browse',
          name: 'browse the catalog',
          stories: [
            { id: 'st-see', name: 'see what is for sale', release: 'r-skeleton' },
            { id: 'st-search', name: 'search the catalog', release: 'r-next' },
          ],
        },
        { id: 's-pay', name: 'pay for it', stories: [{ id: 'st-card', name: 'pay by card' }] },
      ],
    },
    {
      id: 'a-return',
      name: 'return a thing',
      steps: [
        {
          id: 's-ask',
          name: 'ask for a refund',
          stories: [{ id: 'st-refund', name: 'ask for the money back', release: 'r-skeleton' }],
        },
      ],
    },
  ],
};

function idsOn(filed: string[]): string[] {
  return unfiledShelfOf(MAP, filed).stories.map((story) => story.id);
}

describe('the release the backlog shelf puts in focus', () => {
  it('focuses the first release the map declares that still has unfiled stories', () => {
    expect(unfiledShelfOf(MAP, []).release).toStrictEqual({
      id: 'r-skeleton',
      name: 'walking skeleton',
    });
  });

  it('moves focus to the next release once the earlier one is wholly filed', () => {
    expect(unfiledShelfOf(MAP, ['st-see', 'st-refund']).release).toStrictEqual({
      id: 'r-next',
      name: 'the next cut',
    });
  });

  it('focuses no release once every release is wholly filed', () => {
    expect(unfiledShelfOf(MAP, ['st-see', 'st-refund', 'st-search']).release).toBeUndefined();
  });
});

describe('the stories the backlog shelf stands', () => {
  it('stands the unfiled stories of the release in focus, in the order the map declared them', () => {
    expect(idsOn([])).toStrictEqual(['st-see', 'st-refund']);
  });

  it('stands only what is still unfiled inside the release in focus', () => {
    expect(idsOn(['st-see'])).toStrictEqual(['st-refund']);
  });

  it('stands the stories of the release it moved focus to', () => {
    expect(idsOn(['st-see', 'st-refund'])).toStrictEqual(['st-search']);
  });

  it('stands nothing once every release is wholly filed', () => {
    expect(idsOn(['st-see', 'st-refund', 'st-search'])).toStrictEqual([]);
  });

  it('keeps the unassigned bucket out of the release in focus', () => {
    expect(idsOn([])).not.toContain('st-card');
  });
});

describe('the unassigned bucket the shelf carries beside the release', () => {
  it('carries the unfiled stories that point at no release', () => {
    expect(unfiledShelfOf(MAP, []).unassigned).toStrictEqual([
      { id: 'st-card', name: 'pay by card', release: undefined },
    ]);
  });

  it('carries the bucket even once every release is wholly filed', () => {
    const shelf = unfiledShelfOf(MAP, ['st-see', 'st-refund', 'st-search']);

    expect(shelf.unassigned.map((story) => story.id)).toStrictEqual(['st-card']);
  });

  it('drops a bucket story an item was filed for', () => {
    expect(unfiledShelfOf(MAP, ['st-card']).unassigned).toStrictEqual([]);
  });
});
