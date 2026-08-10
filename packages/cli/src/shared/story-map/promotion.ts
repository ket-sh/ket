import type { MapReading, MapStory, StoryMap } from './story-map.ts';

import { titleRefusal } from '../item.ts';
import { MAP_PATH } from './reading.ts';
import { storiesIn } from './story-map.ts';

export type Promotion = { story: MapStory } | { refused: string };

function carriesABreak(id: string): boolean {
  return id.includes('\n') || id.includes('\r');
}

function standing(story: MapStory): Promotion {
  if (carriesABreak(story.id)) {
    return {
      refused: `${MAP_PATH} declares a story id that carries a line break, so it cannot mark a filing`,
    };
  }

  const untitled = titleRefusal(story.name);

  if (untitled !== undefined) {
    return {
      refused: `${MAP_PATH} gives ${story.id} a name that cannot title an item: ${untitled}`,
    };
  }

  return { story };
}

function chosenIn(map: StoryMap, id: string): Promotion {
  const story = storiesIn(map).find((candidate) => candidate.id === id);

  if (story === undefined) {
    return { refused: `${MAP_PATH} declares no story ${id}` };
  }

  return standing(story);
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
