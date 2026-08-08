import { describe, expect, it } from 'vitest';

import type {
  JourneyChildView,
  JourneyNodeView,
  JourneyPaneView,
  JourneyView,
} from '../../../shared/model';
import type { Frame, JourneyFocus, JourneyTab } from '../model/frames.ts';

import { spotOf } from './bindings.ts';

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
  return { kind: 'journey', journey: journeyOf([CHILD]), sel, tab, pick: 0, focus };
}

describe('the spot a frame stands in', () => {
  it('reads the board frame with its layout and its offers', () => {
    expect(spotOf({ kind: 'board' }, 'list', ['approve'])).toStrictEqual({
      kind: 'board',
      layout: 'list',
      offers: ['approve'],
    });
  });

  it('reads a journey outside the workflow tab as the plain canvas', () => {
    expect(spotOf(journeyFrameAt('overview', 'canvas', 'n1'), 'kanban', [])).toStrictEqual({
      kind: 'journey',
      pane: 'canvas',
    });
  });

  it('reads the canvas as plain while nodes still lie to the right', () => {
    expect(spotOf(journeyFrameAt('workflow', 'canvas', 'n0'), 'kanban', [])).toStrictEqual({
      kind: 'journey',
      pane: 'canvas',
    });
  });

  it('reads the brink where no node lies further right', () => {
    expect(spotOf(journeyFrameAt('workflow', 'canvas', 'n1'), 'kanban', [])).toStrictEqual({
      kind: 'journey',
      pane: 'brink',
    });
  });

  it('reads the pane as held once the focus sits in it', () => {
    expect(spotOf(journeyFrameAt('workflow', 'pane', 'n1'), 'kanban', [])).toStrictEqual({
      kind: 'journey',
      pane: 'held',
    });
  });

  it('reads a childless workflow as the plain canvas', () => {
    const frame: Frame = {
      kind: 'journey',
      journey: journeyOf([]),
      sel: 'n1',
      tab: 'workflow',
      pick: 0,
      focus: 'canvas',
    };

    expect(spotOf(frame, 'kanban', [])).toStrictEqual({ kind: 'journey', pane: 'canvas' });
  });
});

describe('the spot a held screen stands in', () => {
  it('reads every held screen by its own kind', () => {
    expect(spotOf({ kind: 'map', reading: { absent: true }, at: 0 }, 'kanban', [])).toStrictEqual({
      kind: 'map',
    });
    expect(spotOf(SURFACE, 'kanban', [])).toStrictEqual({ kind: 'surface' });
    expect(spotOf(GATE, 'kanban', [])).toStrictEqual({ kind: 'gate' });
    expect(spotOf(EDIT, 'kanban', [])).toStrictEqual({ kind: 'edit' });
  });
});
