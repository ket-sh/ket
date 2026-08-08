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
      refusal: { reason: 'no spec named', at: '2026-08-07T11:00:00.000Z' },
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
    {
      id: '.ket/items/K-2/locking.feature',
      kind: 'artifact',
      title: 'locking.feature',
      mark: 'done',
      at: undefined,
      child: undefined,
      doc: {
        kind: 'criteria',
        label: 'Criteria',
        name: 'locking.feature',
        source: 'Feature: locking\n  Scenario: five tries',
      },
    },
  ],
  edges: [['triaged', '.ket/items/K-2/locking.feature']],
  standing: undefined,
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
