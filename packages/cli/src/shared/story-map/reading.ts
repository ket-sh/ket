import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { MapView } from './fold.ts';
import type { MapReading } from './schema.ts';

import { KET_DIRECTORY } from '../locate.ts';
import { foldMap } from './fold.ts';
import { readMap } from './schema.ts';

const MAP_FILE = 'story-map.yaml';

export const MAP_PATH = `${KET_DIRECTORY}/${MAP_FILE}`;

export type MapShowing = { absent: true } | { refusals: string[] } | { map: MapView };

function mapPathIn(root: string): string {
  return join(root, KET_DIRECTORY, MAP_FILE);
}

export async function readMapIn(root: string): Promise<MapReading> {
  const source = await readFile(mapPathIn(root), 'utf8').then(
    (text) => text,
    () => undefined,
  );

  return readMap(source);
}

function showingOf(reading: MapReading): MapShowing {
  return 'map' in reading ? { map: foldMap(reading.map) } : reading;
}

export async function mapShowingIn(root: string): Promise<MapShowing> {
  return showingOf(await readMapIn(root));
}
