import { watch as watchDirectory } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';

import type { KanbanColumn } from '../../shared/kanban.ts';

import { readLog } from '../../shared/event-log.ts';
import { readStored } from '../../shared/item-store.ts';
import { foldKanban } from '../../shared/kanban.ts';

export interface FeedTimings {
  debounce: number;
  poll: number;
}

export interface BoardFeed {
  snapshot: () => Promise<KanbanColumn[]>;
  subscribe: (refresh: () => void) => () => void;
}

const KET_DIRECTORY = '.ket';

const EVENTS = 'events.jsonl';

// The watcher is the fast path and the size poll is the backstop, because
// Bun's fs.watch has a history of missed events across platforms.
function subscription(root: string, timings: FeedTimings, refresh: () => void): () => void {
  let bounce: ReturnType<typeof setTimeout> | undefined;
  let lastSize = -1;

  const bump = (): void => {
    clearTimeout(bounce);
    bounce = setTimeout(refresh, timings.debounce);
  };

  const watcher = watchDirectory(join(root, KET_DIRECTORY), { recursive: true }, bump);

  const polling = setInterval(() => {
    void stat(join(root, KET_DIRECTORY, EVENTS))
      .then((found) => {
        if (found.size !== lastSize) {
          lastSize = found.size;
          bump();
        }
      })
      .catch(() => undefined);
  }, timings.poll);

  return () => {
    watcher.close();
    clearInterval(polling);
    clearTimeout(bounce);
  };
}

export function boardFeedFor(
  root: string,
  timings: FeedTimings = { debounce: 150, poll: 5000 },
): BoardFeed {
  return {
    snapshot: async () => foldKanban(await readStored(root), await readLog(root)),
    subscribe: (refresh) => subscription(root, timings, refresh),
  };
}
