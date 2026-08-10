import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import type { MapStep, MapStory, StoryMap } from './story-map.ts';

import { unfiledStories } from './unfiled.ts';

interface StoryShape {
  name: string;
  at: number | undefined;
}

interface StepShape {
  name: string;
  stories: StoryShape[];
}

interface ActivityShape {
  name: string;
  steps: StepShape[];
}

interface Shape {
  product: string;
  idea: string;
  releases: string[];
  activities: ActivityShape[];
}

const somePhrase = fc.stringMatching(/^[a-z]{1,8}( [a-z]{1,8}){0,2}$/);

const somePick = fc.option(fc.nat({ max: 20 }), { nil: undefined });

const someStep = fc.record({
  name: somePhrase,
  stories: fc.array(fc.record({ name: somePhrase, at: somePick }), { maxLength: 3 }),
});

const someActivity = fc.record({
  name: somePhrase,
  steps: fc.array(someStep, { maxLength: 3 }),
});

const someShape: fc.Arbitrary<Shape> = fc.record({
  product: somePhrase,
  idea: somePhrase,
  releases: fc.array(somePhrase, { maxLength: 3 }),
  activities: fc.array(someActivity, { maxLength: 3 }),
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

function stepOf(step: StepShape, path: string, releases: number): MapStep {
  return {
    id: `s-${path}`,
    name: step.name,
    stories: step.stories.map((story, at) => storyOf(story, `st-${path}-${String(at)}`, releases)),
  };
}

function activityOf(
  activity: ActivityShape,
  at: number,
  releases: number,
): StoryMap['activities'][number] {
  return {
    id: `a-${String(at)}`,
    name: activity.name,
    steps: activity.steps.map((step, stepAt) =>
      stepOf(step, `${String(at)}-${String(stepAt)}`, releases),
    ),
  };
}

function mapOf(shape: Shape): StoryMap {
  const releases = shape.releases.length;

  return {
    version: 1,
    product: { name: shape.product, idea: shape.idea },
    users: [],
    releases: shape.releases.map((name, at) => ({
      id: `r-${String(at)}`,
      name,
      outcome: `${name} happens`,
      metric: `${name} gets counted`,
    })),
    activities: shape.activities.map((activity, at) => activityOf(activity, at, releases)),
  };
}

const someMap = someShape.map(mapOf);

function storyIdsIn(map: StoryMap): string[] {
  return map.activities.flatMap((activity) =>
    activity.steps.flatMap((step) => step.stories.map((story) => story.id)),
  );
}

function unfiledIdsIn(map: StoryMap, filed: string[]): string[] {
  return unfiledStories(map, filed).map((story) => story.id);
}

const someMapWithAStory = someMap.filter((map) => storyIdsIn(map).length > 0);

const someMapAndOneStory = someMapWithAStory.chain((map) =>
  fc.tuple(fc.constant(map), fc.constantFrom(...storyIdsIn(map))),
);

function without(ids: string[], dropped: string): string[] {
  return ids.filter((id) => id !== dropped);
}

function allDeclaredIn(ids: string[], declared: string[]): boolean {
  return ids.every((id) => declared.includes(id));
}

describe('the invariants the unfiled fold keeps', () => {
  it('drops exactly the story filed for and leaves every other declared story standing', () => {
    fc.assert(
      fc.property(someMapAndOneStory, ([map, chosen]) => {
        expect(unfiledIdsIn(map, [chosen])).toStrictEqual(without(storyIdsIn(map), chosen));
      }),
    );
  });

  it('never stands a story the map never declared', () => {
    fc.assert(
      fc.property(someMap, fc.array(somePhrase, { maxLength: 3 }), (map, filed) => {
        expect(allDeclaredIn(unfiledIdsIn(map, filed), storyIdsIn(map))).toBe(true);
      }),
    );
  });

  it('leaves every declared story standing when what was filed names a story off the map', () => {
    fc.assert(
      fc.property(someMap, somePhrase, (map, stray) => {
        expect(unfiledIdsIn(map, [`absent-${stray}`])).toStrictEqual(storyIdsIn(map));
      }),
    );
  });
});
