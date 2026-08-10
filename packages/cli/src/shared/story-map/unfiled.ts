import type { MapStory, StoryMap } from './story-map.ts';

export interface UnfiledStory {
  id: string;
  name: string;
  release: string | undefined;
}

function storiesIn(map: StoryMap): MapStory[] {
  return map.activities.flatMap((activity) => activity.steps.flatMap((step) => step.stories));
}

function standing(story: MapStory): UnfiledStory {
  return { id: story.id, name: story.name, release: story.release };
}

export function unfiledStories(map: StoryMap, filed: readonly string[]): UnfiledStory[] {
  return storiesIn(map)
    .filter((story) => !filed.includes(story.id))
    .map(standing);
}
