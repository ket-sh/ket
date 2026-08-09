import { describe, expect, it } from 'vitest';

import type {
  JourneyChildView,
  JourneyNodeView,
  JourneyPaneView,
  JourneyView,
} from '../../../shared/model';
import type { Frame, JourneyFocus, JourneyTab } from '../model/frames.ts';
import type { ShownWork } from './bindings.ts';

import { spotOf } from './bindings.ts';

const HELD: ShownWork = { cards: 2, logged: 3 };

const IDLE: ShownWork = { cards: 0, logged: 0 };

const PANE: JourneyPaneView = {
  kind: 'feature',
  size: 'story',
  status: 'designing',
  stageAt: 3,
  stageOf: 8,
  parent: undefined,
  refusedTimes: 0,
  arrivedAt: undefined,
  lastEventAt: undefined,
  filed: undefined,
  branch: undefined,
  note: undefined,
  offers: [],
};

const CHILD: JourneyChildView = {
  key: 'K-2',
  title: 'A quiet fix',
  size: 'subtask',
  status: 'triaged',
  since: undefined,
  refusal: undefined,
};

const SURFACE: Frame = {
  kind: 'surface',
  item: 'K-1',
  title: 'K-1 · Spec',
  doc: { kind: 'prose', label: 'Spec', tech: 'locks', plain: undefined, note: undefined },
  aud: 'technical',
  off: 0,
};

const GATE: Frame = {
  kind: 'gate',
  action: 'approve',
  cardKey: 'K-1',
  cardTitle: 'The watched item',
  phase: 'ask',
  reason: undefined,
  since: 0,
};

const EDIT: Frame = {
  kind: 'edit',
  item: 'K-1',
  name: 'locking.feature',
  draft: { lines: [''], cur: { l: 0, c: 0 } },
  dirty: false,
  savedAt: undefined,
};

function nodeOf(id: string): JourneyNodeView {
  return {
    id,
    title: id,
    state: 'done',
    refusal: undefined,
    at: undefined,
    until: undefined,
    note: undefined,
    doc: undefined,
    steps: [],
  };
}

function journeyOf(children: JourneyChildView[]): JourneyView {
  return {
    item: 'K-1',
    title: 'The watched item',
    description: undefined,
    nodes: [nodeOf('n0'), nodeOf('n1')],
    edges: [['n0', 'n1']],
    standing: undefined,
    artifacts: [],
    children,
    pane: PANE,
  };
}

function journeyFrameAt(tab: JourneyTab, focus: JourneyFocus, sel: string): Frame {
  return {
    kind: 'journey',
    journey: journeyOf([CHILD]),
    sel,
    tab,
    pick: 0,
    focus,
    cur: 0,
    aud: 'technical',
    wide: false,
  };
}

describe('the spot the board stands in', () => {
  it('reads the board frame with its layout, its offers, and its work', () => {
    expect(spotOf({ kind: 'board' }, 'list', ['approve'], HELD)).toStrictEqual({
      kind: 'board',
      layout: 'list',
      offers: ['approve'],
      holds: true,
    });
  });

  it('reads a board showing no card as holding nothing', () => {
    expect(spotOf({ kind: 'board' }, 'kanban', [], IDLE)).toStrictEqual({
      kind: 'board',
      layout: 'kanban',
      offers: [],
      holds: false,
    });
  });
});

describe('the spot a journey stands in', () => {
  it('reads the overview tab as the preview', () => {
    expect(spotOf(journeyFrameAt('overview', 'canvas', 'n1'), 'kanban', [], HELD)).toStrictEqual({
      kind: 'journey',
      pane: 'preview',
      wide: false,
      offers: [],
    });
  });

  it('reads the canvas as plain while nodes still lie to the right', () => {
    expect(spotOf(journeyFrameAt('workflow', 'canvas', 'n0'), 'kanban', [], HELD)).toStrictEqual({
      kind: 'journey',
      pane: 'canvas',
      wide: false,
      offers: [],
    });
  });

  it('reads the brink where no node lies further right', () => {
    expect(spotOf(journeyFrameAt('workflow', 'canvas', 'n1'), 'kanban', [], HELD)).toStrictEqual({
      kind: 'journey',
      pane: 'brink',
      wide: false,
      offers: [],
    });
  });

  it('reads the pane as held once the focus sits in it', () => {
    expect(spotOf(journeyFrameAt('workflow', 'pane', 'n1'), 'kanban', [], HELD)).toStrictEqual({
      kind: 'journey',
      pane: 'held',
      wide: false,
      offers: [],
    });
  });

  it('reads a childless workflow as the plain canvas', () => {
    expect(spotOf(childlessFrame(), 'kanban', [], HELD)).toStrictEqual({
      kind: 'journey',
      pane: 'canvas',
      wide: false,
      offers: [],
    });
  });
});

function childlessFrame(): Frame {
  return {
    kind: 'journey',
    journey: journeyOf([]),
    sel: 'n1',
    tab: 'workflow',
    pick: 0,
    focus: 'canvas',
    cur: 0,
    aud: 'technical',
    wide: false,
  };
}

describe('the spot the journey chrome stands in', () => {
  it('reads the focused tab row and the focused content by their own standings', () => {
    expect(spotOf(journeyFrameAt('artifacts', 'tabs', 'n1'), 'kanban', [], HELD)).toStrictEqual({
      kind: 'journey',
      pane: 'tabs',
      wide: false,
      offers: [],
    });
    expect(spotOf(journeyFrameAt('artifacts', 'content', 'n1'), 'kanban', [], HELD)).toStrictEqual({
      kind: 'journey',
      pane: 'reading',
      wide: false,
      offers: [],
    });
  });
});

const A_PAGE = {
  kind: 'page' as const,
  path: 'docs/guide.md',
  name: 'The guide',
  category: undefined,
  sources: [],
  rot: 'fresh' as const,
  broken: undefined,
  touch: undefined,
};

const A_MAP = {
  product: { name: 'shop', idea: 'a place to buy a thing' },
  spine: [],
  bands: [],
};

describe('the spot the docs screen stands in', () => {
  it('reads the docs screen with the focus and the pages it holds', () => {
    const resting: Frame = {
      kind: 'docs',
      catalog: { groups: [{ label: 'pages', rows: [A_PAGE] }] },
      sel: 0,
      focus: 'catalog',
    };
    const bare: Frame = { kind: 'docs', catalog: { groups: [] }, sel: 0, focus: 'catalog' };

    expect(spotOf(resting, 'kanban', [], IDLE)).toStrictEqual({
      kind: 'docs',
      focus: 'catalog',
      holds: true,
    });
    expect(spotOf(bare, 'kanban', [], HELD)).toStrictEqual({
      kind: 'docs',
      focus: 'catalog',
      holds: false,
    });
  });
});

describe('the spot a held screen stands in', () => {
  it('reads the map by whether a story map exists to walk', () => {
    expect(
      spotOf({ kind: 'map', reading: { absent: true }, at: 0 }, 'kanban', [], HELD),
    ).toStrictEqual({ kind: 'map', holds: false });
    expect(
      spotOf({ kind: 'map', reading: { map: A_MAP }, at: 0 }, 'kanban', [], IDLE),
    ).toStrictEqual({ kind: 'map', holds: true });
  });

  it('reads the log by the events it shows', () => {
    expect(spotOf({ kind: 'oplog', events: [], sel: 0 }, 'kanban', [], IDLE)).toStrictEqual({
      kind: 'oplog',
      holds: false,
    });
    expect(spotOf({ kind: 'oplog', events: [], sel: 0 }, 'kanban', [], HELD)).toStrictEqual({
      kind: 'oplog',
      holds: true,
    });
  });

  it('reads every held screen by its own kind', () => {
    expect(spotOf(SURFACE, 'kanban', [], HELD)).toStrictEqual({ kind: 'surface' });
    expect(spotOf(GATE, 'kanban', [], HELD)).toStrictEqual({ kind: 'gate' });
    expect(spotOf(EDIT, 'kanban', [], HELD)).toStrictEqual({ kind: 'edit' });
  });
});
