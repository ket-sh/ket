import type { BoardFeed, JourneyView, KanbanColumnView } from '../../../shared/model';

export const NOW = '2026-08-07T12:00:00.000Z';

export interface ActedFeed extends BoardFeed {
  acted: string[];
}

const COLUMNS: KanbanColumnView[] = [
  { status: 'idea', cards: [] },
  {
    status: 'triaged',
    cards: [
      {
        key: 'K-2',
        title: 'A quiet fix',
        size: 'subtask',
        status: 'triaged',
        since: undefined,
        refusal: undefined,
        offers: ['approve'],
      },
    ],
  },
  {
    status: 'designing',
    cards: [
      {
        key: 'K-1',
        title: 'The watched item',
        size: 'story',
        status: 'designing',
        since: '2026-08-07T10:00:00.000Z',
        refusal: { reason: 'the design names no spec', at: '2026-08-07T11:00:00.000Z' },
        offers: [],
      },
    ],
  },
  { status: 'awaiting-approval', cards: [] },
  { status: 'implementing', cards: [] },
  { status: 'verifying', cards: [] },
  { status: 'awaiting-merge', cards: [] },
  { status: 'shipped', cards: [] },
];

const JOURNEY: JourneyView = {
  item: 'K-1',
  title: 'The watched item',
  nodes: [
    {
      id: 'triaged',
      kind: 'stage',
      title: 'triaged',
      mark: 'done',
      at: '2026-08-07T09:00:00.000Z',
      child: undefined,
      doc: undefined,
    },
    {
      id: 'designing',
      kind: 'stage',
      title: 'designing',
      mark: 'active',
      at: '2026-08-07T10:00:00.000Z',
      child: undefined,
      doc: undefined,
    },
    {
      id: 'K-2',
      kind: 'child',
      title: 'K-2 A quiet fix',
      mark: 'active',
      at: undefined,
      child: 'K-2',
      doc: undefined,
    },
    {
      id: '.ket/items/K-1/spec.md',
      kind: 'artifact',
      title: 'spec.md',
      mark: 'done',
      at: '2026-08-07T11:00:00.000Z',
      child: undefined,
      doc: {
        kind: 'prose',
        label: 'Spec',
        tech: 'Five failures lock the account.',
        plain: 'Five tries and you wait.',
        note: undefined,
      },
    },
  ],
  edges: [
    ['triaged', 'designing'],
    ['designing', 'K-2'],
    ['designing', '.ket/items/K-1/spec.md'],
  ],
  standing: 'no failing test covers it',
};

const CHILD_JOURNEY: JourneyView = {
  item: 'K-2',
  title: 'A quiet fix',
  nodes: [
    {
      id: 'triaged',
      kind: 'stage',
      title: 'triaged',
      mark: 'active',
      at: undefined,
      child: undefined,
      doc: undefined,
    },
  ],
  edges: [],
  standing: undefined,
};

export function feedOf(): ActedFeed {
  const acted: string[] = [];

  return {
    acted,
    snapshot: async () => {
      await Promise.resolve();

      return COLUMNS;
    },
    journey: async (key) => {
      await Promise.resolve();

      if (key === 'K-2') {
        return CHILD_JOURNEY;
      }

      return key === 'K-1' ? JOURNEY : undefined;
    },
    act: async (key, gate) => {
      await Promise.resolve();
      acted.push(`${key} ${gate}`);

      return { moved: 'implementing' };
    },
    subscribe: () => () => undefined,
  };
}
