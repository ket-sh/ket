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
          gate: 'write',
        },
        offers: [],
      },
    ],
  },
];

const WALKED: JourneyView = {
  item: 'DEV-1',
  title: 'Login with lockout',
  description: 'The keeper locks the account after five failures.',
  nodes: [
    {
      id: 'triaged',
      title: 'triaged',
      state: 'done',
      refusal: undefined,
      at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      until: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      doc: undefined,
    },
    {
      id: 'designing',
      title: 'designing',
      state: 'done',
      refusal: undefined,
      at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      until: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      doc: undefined,
    },
    {
      id: 'implementing',
      title: 'implementing',
      state: 'running',
      refusal: undefined,
      at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      until: undefined,
      doc: undefined,
    },
    {
      id: 'shipped',
      title: 'shipped',
      state: 'future',
      refusal: undefined,
      at: undefined,
      until: undefined,
      doc: undefined,
    },
  ],
  edges: [
    ['triaged', 'designing'],
    ['designing', 'implementing'],
    ['implementing', 'shipped'],
  ],
  standing: 'no failing test covers src/auth.ts',
  artifacts: [
    {
      path: '.ket/items/DEV-1/spec.md',
      name: 'spec.md',
      at: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
      doc: undefined,
    },
  ],
  children: [],
  pane: {
    kind: 'feature',
    size: 'story',
    status: 'implementing',
    stageAt: 5,
    stageOf: 8,
    parent: undefined,
    refusedTimes: 0,
    arrivedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    lastEventAt: new Date(Date.now() - 9 * 60 * 1000).toISOString(),
    filed: { by: 'Ada Lovelace', at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
    branch: { name: 'feat/login-lockout', commits: 4 },
  },
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
