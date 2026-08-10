import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import type { MapStep, MapStory, StoryMap } from '../../shared/story-map/story-map.ts';
import type { UnfiledStory } from '../../shared/story-map/unfiled.ts';

import { unfiledStories } from '../../shared/story-map/unfiled.ts';
import { unfiledShelfOf } from './shelf.ts';

interface StoryShape {
  name: string;
  at: number | undefined;
}

interface StepShape {
  name: string;
  stories: StoryShape[];
}

interface Shape {
  releases: string[];
  steps: StepShape[];
}

const somePhrase = fc.stringMatching(/^[a-z]{1,8}( [a-z]{1,8}){0,2}$/);

const someShape: fc.Arbitrary<Shape> = fc.record({
  releases: fc.array(somePhrase, { maxLength: 3 }),
  steps: fc.array(
    fc.record({
      name: somePhrase,
      stories: fc.array(
        fc.record({ name: somePhrase, at: fc.option(fc.nat({ max: 20 }), { nil: undefined }) }),
        { maxLength: 3 },
      ),
    }),
    { maxLength: 3 },
  ),
});

function releaseIdAt(at: number | undefined, count: number): string | undefined {
  if (at === undefined || count === 0) {
    return undefined;
  }

  return `r-${String(at % count)}`;
}

function storyOf(story: StoryShape, id: string, releases: number): MapStory {
  const release = releaseIdAt(story.at, releases);

  return { id, name: story.name, ...(release === undefined ? {} : { release }) };
}

function stepOf(step: StepShape, at: number, releases: number): MapStep {
  return {
    id: `s-${String(at)}`,
    name: step.name,
    stories: step.stories.map((story, storyAt) =>
      storyOf(story, `st-${String(at)}-${String(storyAt)}`, releases),
    ),
  };
}

function mapOf(shape: Shape): StoryMap {
  const releases = shape.releases.length;

  return {
    version: 1,
    product: { name: 'shop', idea: 'a place to buy a thing' },
    users: [],
    releases: shape.releases.map((name, at) => ({
      id: `r-${String(at)}`,
      name,
      outcome: `${name} happens`,
      metric: `${name} gets counted`,
    })),
    activities: [
      {
        id: 'a-0',
        name: 'do a thing',
        steps: shape.steps.map((step, at) => stepOf(step, at, releases)),
      },
    ],
  };
}

const someMap = someShape.map(mapOf);

const someFiled = fc.array(fc.nat({ max: 8 }), { maxLength: 4 });

function filedIdsIn(map: StoryMap, picks: number[]): string[] {
  const ids = unfiledStories(map, []).map((story) => story.id);

  return picks.flatMap((pick) => (ids.length === 0 ? [] : [ids[pick % ids.length] ?? '']));
}

function pointedAt(map: StoryMap, filed: string[], release: string | undefined): UnfiledStory[] {
  return unfiledStories(map, filed).filter((story) => story.release === release);
}

function earliestUnfiledRelease(map: StoryMap, filed: string[]): string | undefined {
  return map.releases
    .map((release) => release.id)
    .find((id) => pointedAt(map, filed, id).length > 0);
}

function expectedStories(map: StoryMap, filed: string[]): UnfiledStory[] {
  const focus = earliestUnfiledRelease(map, filed);

  return focus === undefined ? [] : pointedAt(map, filed, focus);
}

describe('the invariants the backlog shelf keeps', () => {
  it('focuses the earliest release the map declares that still has an unfiled story', () => {
    fc.assert(
      fc.property(someMap, someFiled, (map, picks) => {
        const filed = filedIdsIn(map, picks);

        expect(unfiledShelfOf(map, filed).release?.id).toBe(earliestUnfiledRelease(map, filed));
      }),
    );
  });

  it('stands exactly the unfiled stories of the release it focused, and none otherwise', () => {
    fc.assert(
      fc.property(someMap, someFiled, (map, picks) => {
        const filed = filedIdsIn(map, picks);

        expect(unfiledShelfOf(map, filed).stories).toStrictEqual(expectedStories(map, filed));
      }),
    );
  });

  it('buckets exactly the unfiled stories that point at no release at all', () => {
    fc.assert(
      fc.property(someMap, someFiled, (map, picks) => {
        const filed = filedIdsIn(map, picks);

        expect(unfiledShelfOf(map, filed).unassigned).toStrictEqual(
          pointedAt(map, filed, undefined),
        );
      }),
    );
  });
});
