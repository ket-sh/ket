import { installCapture } from '@anscribe/opentui';

import type { BoardFeed, JourneyView, KanbanColumnView } from '../shared/model';

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
        offers: ['approve'],
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
        offers: [],
      },
    ],
  },
];

const WALKED: JourneyView = {
  item: 'DEV-1',
  title: 'Login with lockout',
  nodes: [
    {
      id: 'triaged',
      kind: 'stage',
      title: 'triaged',
      mark: 'done',
      at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      child: undefined,
      doc: undefined,
    },
    {
      id: 'designing',
      kind: 'stage',
      title: 'designing',
      mark: 'done',
      at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      child: undefined,
      doc: undefined,
    },
    {
      id: '.ket/items/DEV-1/spec.md',
      kind: 'artifact',
      title: 'spec.md',
      mark: 'done',
      at: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
      child: undefined,
      doc: undefined,
    },
    {
      id: 'implementing',
      kind: 'stage',
      title: 'implementing',
      mark: 'active',
      at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      child: undefined,
      doc: undefined,
    },
  ],
  edges: [
    ['triaged', 'designing'],
    ['designing', '.ket/items/DEV-1/spec.md'],
    ['.ket/items/DEV-1/spec.md', 'implementing'],
  ],
  standing: 'no failing test covers src/auth.ts',
};

const feed: BoardFeed = {
  snapshot: async () => {
    await Promise.resolve();

    return REHEARSAL;
  },
  storyMap: async () => {
    await Promise.resolve();

    return { absent: true };
  },
  journey: async (key) => {
    await Promise.resolve();

    return key === 'DEV-1' ? WALKED : undefined;
  },
  act: async () => {
    await Promise.resolve();

    return { moved: 'implementing' };
  },
  saveCriteria: async () => {
    await Promise.resolve();
  },
  subscribe: () => () => undefined,
};

await watch(feed, {
  enhance: (renderer) => {
    installCapture(renderer, { keybinding: 'ctrl+g' });
  },
});
