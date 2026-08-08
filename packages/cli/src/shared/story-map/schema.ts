import type { MapReading, MapStory, StoryMap } from './story-map.ts';

import { heldInYaml } from '../yaml-source.ts';
import { mapFrom } from './shape.ts';

export type { MapReading, MapStory, StoryMap } from './story-map.ts';

function idOf(node: { id: string }): string {
  return node.id;
}

function idsOf(map: StoryMap): string[] {
  return [
    ...map.users.map(idOf),
    ...map.releases.map(idOf),
    ...map.activities.flatMap((activity) => [
      activity.id,
      ...activity.steps.flatMap((step) => [step.id, ...step.stories.map(idOf)]),
    ]),
  ];
}

function refusalsOfDuplicates(map: StoryMap): string[] {
  const ids = idsOf(map);
  const repeated = ids.filter((id, at) => ids.indexOf(id) !== at);

  return [...new Set(repeated)].map((id) => `the id ${id} appears twice`);
}

function missingPointer(
  named: string | undefined,
  known: { id: string }[],
  say: (id: string) => string,
): string[] {
  if (named === undefined || known.some((node) => node.id === named)) {
    return [];
  }

  return [say(named)];
}

function refusalsOfStory(story: MapStory, map: StoryMap): string[] {
  return [
    ...missingPointer(
      story.release,
      map.releases,
      (id) => `the story ${story.id} points at ${id}, which no release declares`,
    ),
    ...missingPointer(
      story.user,
      map.users,
      (id) => `the story ${story.id} names ${id}, which no user declares`,
    ),
  ];
}

function storiesIn(map: StoryMap): MapStory[] {
  return map.activities.flatMap((activity) => activity.steps.flatMap((step) => step.stories));
}

function readingOf(held: unknown): MapReading {
  const shaped = mapFrom(held);

  if ('refusals' in shaped) {
    return shaped;
  }

  const refusals = [
    ...refusalsOfDuplicates(shaped.node),
    ...storiesIn(shaped.node).flatMap((story) => refusalsOfStory(story, shaped.node)),
  ];

  return refusals.length > 0 ? { refusals } : { map: shaped.node };
}

export function readMap(source: string | undefined): MapReading {
  if (source === undefined) {
    return { absent: true };
  }

  const parsed = heldInYaml(source, 'map');

  return 'refusals' in parsed ? parsed : readingOf(parsed.held);
}
