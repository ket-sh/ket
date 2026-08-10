import type { MapReading, MapStory, StoryMap } from './story-map.ts';

import { MAP_PATH } from './reading.ts';
import { storiesIn } from './story-map.ts';

export type Promotion = { story: MapStory } | { refused: string };

function chosenIn(map: StoryMap, id: string): Promotion {
  const story = storiesIn(map).find((candidate) => candidate.id === id);

  if (story === undefined) {
    return { refused: `${MAP_PATH} declares no story ${id}` };
  }

  return { story };
}

export function promotionOf(reading: MapReading, id: string): Promotion {
  if ('absent' in reading) {
    return { refused: `${MAP_PATH} is not there, so nothing declares the story ${id}` };
  }

  if ('refusals' in reading) {
    return {
      refused: `${MAP_PATH} cannot be read, so nothing declares the story ${id}: ${reading.refusals.join('; ')}`,
    };
  }

  return chosenIn(reading.map, id);
}
