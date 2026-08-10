import type { MapRelease, StoryMap } from '../../shared/story-map/story-map.ts';
import type { UnfiledStory } from '../../shared/story-map/unfiled.ts';

import { unfiledStories } from '../../shared/story-map/unfiled.ts';

interface ShelfRelease {
  id: string;
  name: string;
}

export interface UnfiledShelf {
  release: ShelfRelease | undefined;
  stories: UnfiledStory[];
  unassigned: UnfiledStory[];
}

function pointedAt(standing: UnfiledStory[], release: string | undefined): UnfiledStory[] {
  return standing.filter((story) => story.release === release);
}

function focusedIn(map: StoryMap, standing: UnfiledStory[]): MapRelease | undefined {
  return map.releases.find((release) => pointedAt(standing, release.id).length > 0);
}

export function unfiledShelfOf(map: StoryMap, filed: readonly string[]): UnfiledShelf {
  const standing = unfiledStories(map, filed);
  const focused = focusedIn(map, standing);

  if (focused === undefined) {
    return { release: undefined, stories: [], unassigned: pointedAt(standing, undefined) };
  }

  return {
    release: { id: focused.id, name: focused.name },
    stories: pointedAt(standing, focused.id),
    unassigned: pointedAt(standing, undefined),
  };
}
