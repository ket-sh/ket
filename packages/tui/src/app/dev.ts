import { installCapture } from '@anscribe/opentui';

import type { BoardFeed, KanbanColumnView } from '../shared/model';

import { watch } from './index.ts';

const REHEARSAL: KanbanColumnView[] = [
  {
    status: 'triaged',
    cards: [
      {
        key: 'DEV-2',
        title: 'A quiet fix',
        size: 'subtask',
        status: 'triaged',
        since: new Date(Date.now() - 45_000).toISOString(),
        refusal: undefined,
      },
    ],
  },
  {
    status: 'implementing',
    cards: [
      {
        key: 'DEV-1',
        title: 'Login with lockout',
        size: 'story',
        status: 'implementing',
        since: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        refusal: {
          reason: 'no failing test covers src/auth.ts',
          at: new Date(Date.now() - 60_000).toISOString(),
        },
      },
    ],
  },
];

const feed: BoardFeed = {
  snapshot: async () => {
    await Promise.resolve();

    return REHEARSAL;
  },
  subscribe: () => () => undefined,
};

await watch(feed, {
  enhance: (renderer) => {
    installCapture(renderer, { keybinding: 'ctrl+g' });
  },
});
