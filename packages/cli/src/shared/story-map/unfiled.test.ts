import { describe, expect, it } from 'vitest';

import type { StoryMap } from './schema.ts';

import { unfiledStories } from './unfiled.ts';

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
  users: [{ id: 'u-shopper', name: 'shopper' }],
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
            {
              id: 'st-see',
              name: 'see what is for sale',
              user: 'u-shopper',
              release: 'r-skeleton',
            },
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

function idsUnfiledIn(map: StoryMap, filed: string[]): string[] {
  return unfiledStories(map, filed).map((story) => story.id);
}

describe('the stories no item was filed for', () => {
  it('stands every story unfiled when nothing was filed at all', () => {
    expect(idsUnfiledIn(MAP, [])).toStrictEqual(['st-see', 'st-search', 'st-card', 'st-refund']);
  });

  it('drops the story an item was filed for and leaves the rest standing', () => {
    expect(idsUnfiledIn(MAP, ['st-search'])).toStrictEqual(['st-see', 'st-card', 'st-refund']);
  });

  it('leaves every story standing when what was filed names no story in the map', () => {
    expect(idsUnfiledIn(MAP, ['st-nowhere'])).toStrictEqual([
      'st-see',
      'st-search',
      'st-card',
      'st-refund',
    ]);
  });

  it('stands nothing unfiled once an item was filed for every story', () => {
    expect(idsUnfiledIn(MAP, ['st-see', 'st-search', 'st-card', 'st-refund'])).toStrictEqual([]);
  });

  it('keeps the order the map declared, across the activities and their steps', () => {
    expect(idsUnfiledIn(MAP, ['st-card'])).toStrictEqual(['st-see', 'st-search', 'st-refund']);
  });
});

describe('what an unfiled story carries', () => {
  it('carries the title and the release its story points at', () => {
    expect(unfiledStories(MAP, ['st-search', 'st-card', 'st-refund'])).toStrictEqual([
      { id: 'st-see', name: 'see what is for sale', release: 'r-skeleton' },
    ]);
  });

  it('carries no release when its story points at none', () => {
    expect(unfiledStories(MAP, ['st-see', 'st-search', 'st-refund'])).toStrictEqual([
      { id: 'st-card', name: 'pay by card', release: undefined },
    ]);
  });
});
