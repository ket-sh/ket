import { describe, expect, it } from 'vitest';

import type { StoryMap } from './schema.ts';

import { foldMap } from './fold.ts';

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
      steps: [{ id: 's-ask', name: 'ask for a refund', stories: [] }],
    },
  ],
};

const EVERY_STORY_PLACED: StoryMap = {
  version: 1,
  product: { name: 'shop', idea: 'a place to buy a thing' },
  users: [],
  releases: [SKELETON],
  activities: [
    {
      id: 'a-buy',
      name: 'buy a thing',
      steps: [
        {
          id: 's-browse',
          name: 'browse the catalog',
          stories: [{ id: 'st-see', name: 'see what is for sale', release: 'r-skeleton' }],
        },
      ],
    },
  ],
};

function cardIdsIn(map: StoryMap, band: string | undefined): string[] {
  return (foldMap(map).bands.find((candidate) => candidate.id === band)?.cards ?? []).map(
    (card) => card.id,
  );
}

function landedIds(map: StoryMap): string[] {
  return foldMap(map).bands.flatMap((band) => band.cards.map((card) => card.id));
}

describe('the bands a map is cut into', () => {
  it('cuts one band per release, in the order the map declared them', () => {
    expect(foldMap(MAP).bands.map((band) => band.name)).toStrictEqual([
      'walking skeleton',
      'the next cut',
      'unassigned',
    ]);
  });

  it('closes the list with the unassigned bucket, which names no release', () => {
    expect(foldMap(MAP).bands.at(-1)).toStrictEqual({
      id: undefined,
      name: 'unassigned',
      outcome: undefined,
      cards: [{ id: 'st-card', name: 'pay by card', step: 's-pay' }],
    });
  });

  it('gives every band the outcome its release promised', () => {
    expect(foldMap(MAP).bands.map((band) => band.outcome)).toStrictEqual([
      'a shopper completes one real purchase',
      'a shopper comes back',
      undefined,
    ]);
  });

  it('keeps the unassigned bucket on the page even when every story is placed', () => {
    expect(foldMap(EVERY_STORY_PLACED).bands.at(-1)).toStrictEqual({
      id: undefined,
      name: 'unassigned',
      outcome: undefined,
      cards: [],
    });
  });
});

describe('the cards a band carries', () => {
  it('lands every story in exactly one band', () => {
    expect([...landedIds(MAP)].sort((one, other) => one.localeCompare(other))).toStrictEqual([
      'st-card',
      'st-search',
      'st-see',
    ]);
  });

  it('lands a story under the release it points at', () => {
    expect(cardIdsIn(MAP, 'r-skeleton')).toStrictEqual(['st-see']);
    expect(cardIdsIn(MAP, 'r-next')).toStrictEqual(['st-search']);
  });

  it('lands a story that points at no release in the unassigned bucket', () => {
    expect(cardIdsIn(MAP, undefined)).toStrictEqual(['st-card']);
  });

  it('hands each card the step it hangs under, so the view can column it', () => {
    expect(foldMap(MAP).bands[0]?.cards).toStrictEqual([
      { id: 'st-see', name: 'see what is for sale', step: 's-browse', user: 'u-shopper' },
    ]);
  });

  it('leaves a card unattributed when its story named no user', () => {
    expect(foldMap(MAP).bands[1]?.cards).toStrictEqual([
      { id: 'st-search', name: 'search the catalog', step: 's-browse' },
    ]);
  });
});

describe('the backbone across the top', () => {
  it('lists each activity with the steps that hang under it, in map order', () => {
    expect(foldMap(MAP).spine).toStrictEqual([
      {
        activity: 'buy a thing',
        steps: [
          { id: 's-browse', name: 'browse the catalog' },
          { id: 's-pay', name: 'pay for it' },
        ],
      },
      { activity: 'return a thing', steps: [{ id: 's-ask', name: 'ask for a refund' }] },
    ]);
  });

  it('carries the product the map opens with', () => {
    expect(foldMap(MAP).product).toStrictEqual({
      name: 'shop',
      idea: 'a place to buy a thing',
    });
  });
});
