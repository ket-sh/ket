import type {
  BoardFeed,
  JourneyView,
  KanbanCardView,
  KanbanColumnView,
  StoryMapView,
} from '../../../shared/model';

export const NOW = '2026-08-07T12:00:00.000Z';

const MAP: StoryMapView = {
  product: { name: 'shop', idea: 'a place to buy a thing' },
  spine: [
    {
      activity: 'buy a thing',
      steps: [
        { id: 's-browse', name: 'browse the catalog' },
        { id: 's-pay', name: 'pay for it' },
      ],
    },
  ],
  bands: [
    {
      id: 'r-skeleton',
      name: 'walking skeleton',
      outcome: 'one real purchase',
      cards: [
        { id: 'st-see', name: 'see the shelves', step: 's-browse' },
        { id: 'st-card', name: 'pay by card', step: 's-pay' },
      ],
    },
    { id: undefined, name: 'unassigned', outcome: undefined, cards: [] },
  ],
};

export interface ActedFeed extends BoardFeed {
  acted: string[];
  saved: string[];
  shift: (key: string, status: string) => void;
}

export const STAGES = [
  'idea',
  'triaged',
  'designing',
  'awaiting-approval',
  'implementing',
  'verifying',
  'awaiting-merge',
  'shipped',
];

const SEATED: Record<string, KanbanCardView[]> = {
  triaged: [
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
  designing: [
    {
      key: 'K-1',
      title: 'The watched item',
      size: 'story',
      status: 'designing',
      since: '2026-08-07T10:00:00.000Z',
      refusal: { reason: 'no spec named', at: '2026-08-07T11:00:00.000Z', gate: 'write' },
      offers: [],
    },
  ],
};

const COLUMNS: KanbanColumnView[] = STAGES.map((status) => ({
  status,
  cards: SEATED[status] ?? [],
}));

const JOURNEY: JourneyView = {
  item: 'K-1',
  title: 'The watched item',
  description: 'The keeper locks the account after five failures.',
  nodes: [
    {
      id: 'triaged',
      title: 'triaged',
      state: 'done',
      refusal: undefined,
      at: '2026-08-07T09:00:00.000Z',
      until: '2026-08-07T10:00:00.000Z',
      doc: undefined,
    },
    {
      id: 'designing',
      title: 'designing',
      state: 'running',
      refusal: undefined,
      at: '2026-08-07T10:00:00.000Z',
      until: undefined,
      doc: undefined,
    },
    {
      id: 'awaiting-approval',
      title: 'awaiting-approval',
      state: 'future',
      refusal: undefined,
      at: undefined,
      until: undefined,
      doc: undefined,
    },
  ],
  edges: [
    ['triaged', 'designing'],
    ['designing', 'awaiting-approval'],
  ],
  standing: 'no failing test covers it',
  artifacts: [
    {
      path: '.ket/items/K-1/spec.md',
      name: 'spec.md',
      at: '2026-08-07T11:00:00.000Z',
      doc: {
        kind: 'prose',
        label: 'Spec',
        tech: 'Five failures lock the account.',
        plain: 'Five tries and you wait.',
        note: undefined,
      },
    },
  ],
  children: [
    {
      key: 'K-2',
      title: 'A quiet fix',
      size: 'subtask',
      status: 'triaged',
      since: undefined,
      refusal: undefined,
    },
  ],
  pane: {
    kind: 'feature',
    size: 'story',
    status: 'designing',
    stageAt: 3,
    stageOf: 8,
    parent: undefined,
    refusedTimes: 1,
    arrivedAt: '2026-08-07T10:00:00.000Z',
    lastEventAt: '2026-08-07T10:30:00.000Z',
    filed: { by: 'Ada Lovelace', at: '2026-08-07T08:00:00.000Z' },
    branch: { name: 'feat/watched', commits: 4 },
  },
};

const CHILD_JOURNEY: JourneyView = {
  item: 'K-2',
  title: 'A quiet fix',
  description: undefined,
  nodes: [
    {
      id: 'triaged',
      title: 'triaged',
      state: 'running',
      refusal: undefined,
      at: undefined,
      until: undefined,
      doc: undefined,
    },
  ],
  edges: [],
  standing: undefined,
  artifacts: [
    {
      path: '.ket/items/K-2/locking.feature',
      name: 'locking.feature',
      at: undefined,
      doc: {
        kind: 'criteria',
        label: 'Criteria',
        name: 'locking.feature',
        source: 'Feature: locking\n  Scenario: five tries',
      },
    },
  ],
  children: [],
  pane: {
    kind: 'chore',
    size: 'subtask',
    status: 'triaged',
    stageAt: 2,
    stageOf: 8,
    parent: 'K-1',
    refusedTimes: 0,
    arrivedAt: undefined,
    lastEventAt: undefined,
    filed: undefined,
    branch: undefined,
  },
};

function movedInto(columns: KanbanColumnView[], key: string, status: string): void {
  const card = columns.flatMap((column) => column.cards).find((one) => one.key === key);

  if (card === undefined) {
    return;
  }

  for (const column of columns) {
    column.cards = column.cards.filter((one) => one.key !== key);
  }

  card.status = status;
  card.offers = [];
  columns.find((column) => column.status === status)?.cards.push(card);
}

export function feedOf(): ActedFeed {
  const acted: string[] = [];
  const saved: string[] = [];
  const columns = structuredClone(COLUMNS);
  let told: (() => void) | undefined;

  return {
    acted,
    saved,
    shift: (key, status) => {
      movedInto(columns, key, status);
      told?.();
    },
    snapshot: async () => {
      await Promise.resolve();

      return columns;
    },
    storyMap: async () => {
      await Promise.resolve();

      return { map: MAP };
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
      movedInto(columns, key, 'implementing');
      told?.();

      return { moved: 'implementing' };
    },
    saveCriteria: async (key, name, source) => {
      await Promise.resolve();
      saved.push(`${key} ${name} ${source}`);
    },
    subscribe: (refresh) => {
      told = refresh;

      return () => {
        told = undefined;
      };
    },
  };
}
