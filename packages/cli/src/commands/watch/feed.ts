import { watch as watchDirectory } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';

import type { Journey } from '../../shared/journey.ts';
import type { KanbanColumn } from '../../shared/kanban.ts';
import type { LoggedEvent } from '../../shared/log-lines.ts';
import type { Moved } from '../../shared/stage.ts';
import type { MapShowing } from '../../shared/story-map/reading.ts';
import type { GateAction } from '../../shared/transition.ts';
import type { DocsCatalog } from './docs-catalog.ts';
import type { UnfiledShelf } from './shelf.ts';

import { readLog } from '../../shared/event-log.ts';
import { arriveAlone, readStored } from '../../shared/item-store.ts';
import { foldJourney } from '../../shared/journey.ts';
import { foldKanban } from '../../shared/kanban.ts';
import { foldOplog } from '../../shared/oplog.ts';
import { filedStoriesFrom } from '../../shared/read-item.ts';
import { decisionOf, moveThrough } from '../../shared/stage.ts';
import { promotionOf } from '../../shared/story-map/promotion.ts';
import { mapShowingIn, readMapIn } from '../../shared/story-map/reading.ts';
import { docsCatalogFor } from './docs-catalog.ts';
import { docsFor } from './docs.ts';
import { repoFactsFor } from './provenance.ts';
import { writeCriteria } from './save.ts';
import { unfiledShelfOf } from './shelf.ts';

export interface FeedTimings {
  debounce: number;
  poll: number;
}

export type DirectoryWatch = (path: string, changed: () => void) => () => void;

type Promoted = { filed: string } | { refused: string };

export interface BoardFeed {
  snapshot: () => Promise<KanbanColumn[]>;
  storyMap: () => Promise<MapShowing>;
  unfiledShelf: () => Promise<UnfiledShelf>;
  promote: (id: string) => Promise<Promoted>;
  journey: (key: string) => Promise<Journey | undefined>;
  act: (key: string, gate: GateAction) => Promise<Moved>;
  saveCriteria: (key: string, name: string, source: string) => Promise<void>;
  oplog: () => Promise<LoggedEvent[]>;
  docsCatalog: () => Promise<DocsCatalog>;
  subscribe: (refresh: () => void) => () => void;
}

const KET_DIRECTORY = '.ket';

const EVENTS = 'events.jsonl';

const watchingTheDirectory: DirectoryWatch = (path, changed) => {
  const watcher = watchDirectory(path, { recursive: true }, changed);

  return () => {
    watcher.close();
  };
};

// The watcher is the fast path and the size poll is the backstop, because
// Bun's fs.watch has a history of missed events across platforms.
function subscription(
  root: string,
  timings: FeedTimings,
  refresh: () => void,
  watching: DirectoryWatch,
): () => void {
  let bounce: ReturnType<typeof setTimeout> | undefined;
  let lastSize = -1;

  const bump = (): void => {
    clearTimeout(bounce);
    bounce = setTimeout(refresh, timings.debounce);
  };

  const letGo = watching(join(root, KET_DIRECTORY), bump);

  const polling = setInterval(() => {
    void stat(join(root, KET_DIRECTORY, EVENTS))
      .then((found) => {
        const grown = lastSize >= 0 && found.size !== lastSize;

        lastSize = found.size;

        if (grown) {
          bump();
        }
      })
      .catch(() => undefined);
  }, timings.poll);

  return () => {
    letGo();
    clearInterval(polling);
    clearTimeout(bounce);
  };
}

const EMPTY_SHELF: UnfiledShelf = { release: undefined, stories: [], unassigned: [] };

async function shelfIn(root: string): Promise<UnfiledShelf> {
  const reading = await readMapIn(root);

  if (!('map' in reading)) {
    return EMPTY_SHELF;
  }

  return unfiledShelfOf(reading.map, filedStoriesFrom(await readStored(root)));
}

async function promoteIn(root: string, id: string): Promise<Promoted> {
  const promotion = promotionOf(await readMapIn(root), id);

  if ('refused' in promotion) {
    return promotion;
  }

  const key = await arriveAlone(root, {
    title: promotion.story.name,
    kind: 'feature',
    size: 'story',
    story: promotion.story.id,
  });

  return { filed: key };
}

export function boardFeedFor(
  root: string,
  timings: FeedTimings = { debounce: 150, poll: 5000 },
  watching: DirectoryWatch = watchingTheDirectory,
): BoardFeed {
  return {
    snapshot: async () => foldKanban(await readStored(root), await readLog(root)),
    storyMap: async (): Promise<MapShowing> => mapShowingIn(root),
    unfiledShelf: async (): Promise<UnfiledShelf> => shelfIn(root),
    promote: async (id): Promise<Promoted> => promoteIn(root, id),
    journey: async (key) => {
      const log = await readLog(root);
      const journey = foldJourney(await readStored(root), log, key, await repoFactsFor(root, key));

      if (journey === undefined) {
        return undefined;
      }

      return docsFor(join(root, KET_DIRECTORY, 'items', key), log, journey);
    },
    act: async (key, gate) => moveThrough(root, key, gate, decisionOf(gate)),
    saveCriteria: async (key, name, source) => writeCriteria(root, key, name, source),
    oplog: async () => foldOplog(await readLog(root)),
    docsCatalog: async () => docsCatalogFor(root),
    subscribe: (refresh) => subscription(root, timings, refresh, watching),
  };
}
