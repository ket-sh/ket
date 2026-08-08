import { describe, expect, it } from 'vitest';

import type { MapStory, StoryMap } from './schema.ts';

import { readMap } from './schema.ts';

const VALID = `version: 1
product:
  name: shop
  idea: one sentence saying what this is and for whom
users:
  - id: u-shopper
    name: shopper
releases:
  - id: r-skeleton
    name: walking skeleton
    outcome: a shopper completes one real purchase end to end
    metric: one paid order lands in the ledger
activities:
  - id: a-buy
    name: buy a thing
    steps:
      - id: s-browse
        name: browse the catalog
        stories:
          - id: st-see-products
            name: see what is for sale
            user: u-shopper
            release: r-skeleton
`;

const ORDERED = `version: 1
product:
  name: shop
  idea: an idea
releases:
  - id: r-two
    name: second
    outcome: an outcome
    metric: a metric
  - id: r-one
    name: first
    outcome: an outcome
    metric: a metric
activities:
  - id: a-zulu
    name: do zulu
    steps:
      - id: s-yankee
        name: step yankee
        stories:
          - id: st-9
            name: story nine
          - id: st-8
            name: story eight
      - id: s-xray
        name: step xray
        stories: []
  - id: a-alpha
    name: do alpha
    steps: []
`;

function mapOf(source: string): StoryMap {
  const reading = readMap(source);

  if (!('map' in reading)) {
    throw new Error(`the map refused to read: ${JSON.stringify(reading)}`);
  }

  return reading.map;
}

function idOf(node: { id: string }): string {
  return node.id;
}

function storiesOf(map: StoryMap): MapStory[] {
  return map.activities.flatMap((activity) => activity.steps.flatMap((step) => step.stories));
}

describe('a map that was never written', () => {
  it('reads as absent rather than as a refusal', () => {
    expect(readMap(undefined)).toStrictEqual({ absent: true });
  });
});

describe('what a readable map carries across the top', () => {
  it('carries the product the map opens with, and the version it agreed to', () => {
    expect(mapOf(VALID).product).toStrictEqual({
      name: 'shop',
      idea: 'one sentence saying what this is and for whom',
    });
    expect(mapOf(VALID).version).toBe(1);
  });

  it('carries the releases the map declares, whole', () => {
    expect(mapOf(VALID).releases).toStrictEqual([
      {
        id: 'r-skeleton',
        name: 'walking skeleton',
        outcome: 'a shopper completes one real purchase end to end',
        metric: 'one paid order lands in the ledger',
      },
    ]);
  });

  it('carries the cast of users the map introduces', () => {
    expect(mapOf(VALID).users).toStrictEqual([{ id: 'u-shopper', name: 'shopper' }]);
  });

  it('reads a map that introduces no users as one with an empty cast', () => {
    const cast = VALID.replace('users:\n  - id: u-shopper\n    name: shopper\n', '').replace(
      '            user: u-shopper\n',
      '',
    );

    expect(mapOf(cast).users).toStrictEqual([]);
  });
});

describe('what a readable map hangs beneath the backbone', () => {
  it('hangs the story under its step under its activity, with both references', () => {
    expect(mapOf(VALID).activities).toStrictEqual([
      {
        id: 'a-buy',
        name: 'buy a thing',
        steps: [
          {
            id: 's-browse',
            name: 'browse the catalog',
            stories: [
              {
                id: 'st-see-products',
                name: 'see what is for sale',
                user: 'u-shopper',
                release: 'r-skeleton',
              },
            ],
          },
        ],
      },
    ]);
  });

  it('leaves a story that names neither user nor release unadorned', () => {
    const bare = VALID.replace(
      '            user: u-shopper\n            release: r-skeleton\n',
      '',
    );

    expect(storiesOf(mapOf(bare))).toStrictEqual([
      { id: 'st-see-products', name: 'see what is for sale' },
    ]);
  });
});

describe('the order the file wrote', () => {
  it('keeps releases and activities in the order they were written', () => {
    expect(mapOf(ORDERED).releases.map(idOf)).toStrictEqual(['r-two', 'r-one']);
    expect(mapOf(ORDERED).activities.map(idOf)).toStrictEqual(['a-zulu', 'a-alpha']);
  });

  it('keeps steps and stories in the order they were written', () => {
    const steps = mapOf(ORDERED).activities.map((activity) => activity.steps.map(idOf));

    expect(steps).toStrictEqual([['s-yankee', 's-xray'], []]);
    expect(storiesOf(mapOf(ORDERED)).map(idOf)).toStrictEqual(['st-9', 'st-8']);
  });
});
