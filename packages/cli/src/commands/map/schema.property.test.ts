import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { stringify } from 'yaml';

import type { StoryMap } from './schema.ts';

import { readMap } from './schema.ts';

interface DraftStory {
  name: string;
  user: number | undefined;
  release: number | undefined;
}

interface DraftStep {
  name: string;
  stories: DraftStory[];
}

interface DraftActivity {
  name: string;
  steps: DraftStep[];
}

interface Draft {
  product: string;
  idea: string;
  users: string[];
  releases: { name: string; outcome: string; metric: string }[];
  activities: DraftActivity[];
}

interface Cast {
  users: string[];
  releases: string[];
}

const somePhrase = fc.stringMatching(/^[a-z]{1,8}( [a-z]{1,8}){0,2}$/);

const somePick = fc.option(fc.nat({ max: 20 }), { nil: undefined });

const someStory = fc.record({ name: somePhrase, user: somePick, release: somePick });

const someStep = fc.record({
  name: somePhrase,
  stories: fc.array(someStory, { maxLength: 3 }),
});

const someActivity = fc.record({
  name: somePhrase,
  steps: fc.array(someStep, { maxLength: 3 }),
});

const someDraft: fc.Arbitrary<Draft> = fc.record({
  product: somePhrase,
  idea: somePhrase,
  users: fc.array(somePhrase, { maxLength: 3 }),
  releases: fc.array(fc.record({ name: somePhrase, outcome: somePhrase, metric: somePhrase }), {
    maxLength: 3,
  }),
  activities: fc.array(someActivity, { maxLength: 3 }),
});

const POINTING: DraftActivity = {
  name: 'walk the walk',
  steps: [{ name: 'take a step', stories: [{ name: 'a card', user: undefined, release: 0 }] }],
};

const somePointingDraft = someDraft.map((draft) => ({
  ...draft,
  activities: [POINTING, ...draft.activities],
}));

function idAt(prefix: string, at: number): string {
  return `${prefix}-${String(at)}`;
}

function idsFor(prefix: string, count: number): string[] {
  return Array.from({ length: count }, (_, at) => idAt(prefix, at));
}

function castOf(draft: Draft): Cast {
  return {
    users: idsFor('u', draft.users.length),
    releases: idsFor('r', draft.releases.length),
  };
}

function pointer(key: string, at: number | undefined, ids: string[]): object {
  if (at === undefined || ids.length === 0) {
    return {};
  }

  return { [key]: ids[at % ids.length] };
}

function storyDocOf(story: DraftStory, id: string, cast: Cast): object {
  return {
    id,
    name: story.name,
    ...pointer('user', story.user, cast.users),
    ...pointer('release', story.release, cast.releases),
  };
}

function stepDocOf(step: DraftStep, path: string, cast: Cast): object {
  return {
    id: `s-${path}`,
    name: step.name,
    stories: step.stories.map((story, at) => storyDocOf(story, `st-${path}-${String(at)}`, cast)),
  };
}

function activityDocOf(activity: DraftActivity, at: number, cast: Cast): object {
  return {
    id: idAt('a', at),
    name: activity.name,
    steps: activity.steps.map((step, stepAt) =>
      stepDocOf(step, `${String(at)}-${String(stepAt)}`, cast),
    ),
  };
}

function documentOf(draft: Draft, cast: Cast): object {
  return {
    version: 1,
    product: { name: draft.product, idea: draft.idea },
    users: draft.users.map((name, at) => ({ id: idAt('u', at), name })),
    releases: draft.releases.map((release, at) => ({ id: idAt('r', at), ...release })),
    activities: draft.activities.map((activity, at) => activityDocOf(activity, at, cast)),
  };
}

function textOf(draft: Draft, cast: Cast): string {
  return stringify(documentOf(draft, cast));
}

function idOf(node: { id: string }): string {
  return node.id;
}

function readIds(map: StoryMap): string[] {
  return [
    ...map.users.map(idOf),
    ...map.releases.map(idOf),
    ...map.activities.flatMap((activity) => [
      activity.id,
      ...activity.steps.flatMap((step) => [step.id, ...step.stories.map(idOf)]),
    ]),
  ];
}

function writtenIds(draft: Draft): string[] {
  return [
    ...idsFor('u', draft.users.length),
    ...idsFor('r', draft.releases.length),
    ...draft.activities.flatMap((activity, at) => [
      idAt('a', at),
      ...activity.steps.flatMap((step, stepAt) => {
        const path = `${String(at)}-${String(stepAt)}`;

        return [`s-${path}`, ...step.stories.map((_, storyAt) => `st-${path}-${String(storyAt)}`)];
      }),
    ]),
  ];
}

function pointingIds(draft: Draft): string[] {
  return draft.activities.flatMap((activity, at) =>
    activity.steps.flatMap((step, stepAt) =>
      step.stories.flatMap((story, storyAt) =>
        story.release === undefined
          ? []
          : [`st-${String(at)}-${String(stepAt)}-${String(storyAt)}`],
      ),
    ),
  );
}

function danglingRefusals(draft: Draft, gone: string): string[] {
  return pointingIds(draft).map(
    (id) => `the story ${id} points at ${gone}, which no release declares`,
  );
}

function mapOf(draft: Draft): StoryMap {
  const reading = readMap(textOf(draft, castOf(draft)));

  if (!('map' in reading)) {
    throw new Error(`the map refused to read: ${JSON.stringify(reading)}`);
  }

  return reading.map;
}

describe('the invariants a story map keeps', () => {
  it('reads back every map the interview could have written, with nothing refused', () => {
    fc.assert(
      fc.property(someDraft, (draft) => {
        expect(Object.keys(readMap(textOf(draft, castOf(draft))))).toStrictEqual(['map']);
      }),
    );
  });

  it('gives back every node in the order the file laid it out', () => {
    fc.assert(
      fc.property(someDraft, (draft) => {
        expect(readIds(mapOf(draft))).toStrictEqual(writtenIds(draft));
      }),
    );
  });

  it('names the story and the release when a story points where no release stands', () => {
    fc.assert(
      fc.property(somePointingDraft, fc.stringMatching(/^r-[a-z]{2,6}$/), (draft, gone) => {
        const reading = readMap(textOf(draft, { users: castOf(draft).users, releases: [gone] }));

        expect(reading).toStrictEqual({ refusals: danglingRefusals(draft, gone) });
      }),
    );
  });
});
