import type {
  BoardFeed,
  DocsCatalogView,
  JourneyView,
  KanbanCardView,
  KanbanColumnView,
  OplogEventView,
  StoryMapView,
  UnfiledShelfView,
  UnfiledStoryView,
} from '../../../shared/model';

import { DOCS } from './docs-fixtures.ts';
import { CHILD_JOURNEY, JOURNEY, NARRATED } from './journey-fixtures.ts';
import { LOGGED } from './oplog-fixtures.ts';

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

const SHELF: UnfiledShelfView = {
  release: { id: 'r-skeleton', name: 'walking skeleton' },
  stories: [
    { id: 'st-see', name: 'see the shelves', release: 'r-skeleton' },
    { id: 'st-card', name: 'pay by card', release: 'r-skeleton' },
  ],
  unassigned: [{ id: 'st-refund', name: 'ask for a refund', release: undefined }],
};

const BARE_SHELF: UnfiledShelfView = { release: undefined, stories: [], unassigned: [] };

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
      kind: 'bug',
      parent: 'K-1',
      since: undefined,
      refusal: undefined,
      note: undefined,
      offers: ['approve'],
    },
  ],
  designing: [
    {
      key: 'K-1',
      title: 'The watched item',
      size: 'story',
      status: 'designing',
      kind: 'feature',
      parent: undefined,
      since: '2026-08-07T10:00:00.000Z',
      refusal: { reason: 'no spec named', at: '2026-08-07T11:00:00.000Z', gate: 'write' },
      note: NARRATED,
      offers: [],
    },
  ],
};

const COLUMNS: KanbanColumnView[] = STAGES.map((status) => ({
  status,
  cards: SEATED[status] ?? [],
}));

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

function standingIn(columns: KanbanColumnView[], held: JourneyView): JourneyView {
  const card = columns.flatMap((column) => column.cards).find((one) => one.key === held.item);

  if (card === undefined) {
    return held;
  }

  return {
    ...held,
    pane: {
      ...held.pane,
      status: card.status,
      stageAt: STAGES.indexOf(card.status) + 1,
      offers: card.offers,
    },
  };
}

async function loggedRows(): Promise<OplogEventView[]> {
  await Promise.resolve();

  return [...LOGGED];
}

async function shelvedDocs(): Promise<DocsCatalogView> {
  await Promise.resolve();

  return structuredClone(DOCS);
}

export function idleFeedOf(): ActedFeed {
  return feedWith(
    STAGES.map((status) => ({ status, cards: [] })),
    structuredClone(BARE_SHELF),
  );
}

export function feedOf(): ActedFeed {
  return feedWith(structuredClone(COLUMNS), structuredClone(SHELF));
}

export function filedFeedOf(): ActedFeed {
  return feedWith(structuredClone(COLUMNS), structuredClone(BARE_SHELF));
}

function filedFrom(story: UnfiledStoryView, key: string): KanbanCardView {
  return {
    key,
    title: story.name,
    size: 'story',
    status: 'triaged',
    kind: 'feature',
    parent: undefined,
    since: undefined,
    refusal: undefined,
    note: undefined,
    offers: ['approve'],
  };
}

type Shelving = Pick<BoardFeed, 'promote' | 'unfiledShelf'>;

function shelvingOf(
  columns: KanbanColumnView[],
  shelf: UnfiledShelfView,
  acted: string[],
  tell: () => void,
): Shelving {
  return {
    unfiledShelf: async () => {
      await Promise.resolve();

      return structuredClone(shelf);
    },
    promote: async (id) => {
      await Promise.resolve();
      acted.push(`${id} promote`);

      const story = [...shelf.stories, ...shelf.unassigned].find((one) => one.id === id);

      if (story === undefined) {
        return { refused: `no story on the map carries the id ${id}` };
      }

      const key = `K-${String(columns.flatMap((column) => column.cards).length + 1)}`;

      shelf.stories = shelf.stories.filter((one) => one.id !== id);
      shelf.unassigned = shelf.unassigned.filter((one) => one.id !== id);
      columns.find((column) => column.status === 'triaged')?.cards.push(filedFrom(story, key));
      tell();

      return { filed: key };
    },
  };
}

function feedWith(columns: KanbanColumnView[], shelf: UnfiledShelfView): ActedFeed {
  const acted: string[] = [];
  const saved: string[] = [];
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

      return columns.map((column) => ({ ...column, cards: [...column.cards] }));
    },
    storyMap: async () => {
      await Promise.resolve();

      return { map: MAP };
    },
    ...shelvingOf(columns, shelf, acted, () => {
      told?.();
    }),
    journey: async (key) => {
      await Promise.resolve();

      if (key === 'K-2') {
        return standingIn(columns, CHILD_JOURNEY);
      }

      return key === 'K-1' ? standingIn(columns, JOURNEY) : undefined;
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
    oplog: loggedRows,
    docsCatalog: shelvedDocs,
    subscribe: (refresh) => {
      told = refresh;

      return () => {
        told = undefined;
      };
    },
  };
}
