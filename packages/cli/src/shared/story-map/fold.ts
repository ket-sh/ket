import type { MapActivity, MapRelease, MapStory, StoryMap } from './story-map.ts';

interface MapCard {
  id: string;
  name: string;
  step: string;
  user?: string;
}

interface MapBand {
  id: string | undefined;
  name: string;
  outcome: string | undefined;
  cards: MapCard[];
}

interface MapRib {
  activity: string;
  steps: { id: string; name: string }[];
}

export interface MapView {
  product: { name: string; idea: string };
  spine: MapRib[];
  bands: MapBand[];
}

interface Placed {
  card: MapCard;
  release: string | undefined;
}

const UNASSIGNED = 'unassigned';

function cardOf(story: MapStory, step: string): MapCard {
  return {
    id: story.id,
    name: story.name,
    step,
    ...(story.user === undefined ? {} : { user: story.user }),
  };
}

function placedIn(map: StoryMap): Placed[] {
  return map.activities.flatMap((activity) =>
    activity.steps.flatMap((step) =>
      step.stories.map((story) => ({ card: cardOf(story, step.id), release: story.release })),
    ),
  );
}

function cardsOf(placed: Placed[], release: string | undefined): MapCard[] {
  return placed.filter((entry) => entry.release === release).map((entry) => entry.card);
}

function bandOf(release: MapRelease, placed: Placed[]): MapBand {
  return {
    id: release.id,
    name: release.name,
    outcome: release.outcome,
    cards: cardsOf(placed, release.id),
  };
}

function bucketOf(placed: Placed[]): MapBand {
  return {
    id: undefined,
    name: UNASSIGNED,
    outcome: undefined,
    cards: cardsOf(placed, undefined),
  };
}

function ribOf(activity: MapActivity): MapRib {
  return {
    activity: activity.name,
    steps: activity.steps.map((step) => ({ id: step.id, name: step.name })),
  };
}

export function foldMap(map: StoryMap): MapView {
  const placed = placedIn(map);

  return {
    product: { name: map.product.name, idea: map.product.idea },
    spine: map.activities.map(ribOf),
    bands: [...map.releases.map((release) => bandOf(release, placed)), bucketOf(placed)],
  };
}
