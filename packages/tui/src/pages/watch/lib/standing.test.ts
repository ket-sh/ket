import { describe, expect, it } from 'vitest';

import type { JourneyView } from '../../../shared/model';
import type { Frame } from '../model/frames.ts';

import { standingOf } from './standing.ts';

function journeyOf(key: string): JourneyView {
  return {
    item: key,
    title: 'The watched item',
    description: undefined,
    nodes: [],
    edges: [],
    standing: undefined,
    artifacts: [],
    children: [],
    pane: {
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
    },
  };
}

function journeyFrame(key: string, tab: 'overview' | 'artifacts'): Frame {
  return { kind: 'journey', journey: journeyOf(key), sel: '', tab, pick: 0, focus: 'canvas' };
}

const SURFACE: Frame = {
  kind: 'surface',
  item: 'K-1',
  title: 'K-1 · Spec',
  doc: {
    kind: 'prose',
    label: 'Spec',
    tech: 'Five failures lock.',
    plain: undefined,
    note: undefined,
  },
  aud: 'technical',
  off: 0,
};

const MAP: Frame = {
  kind: 'map',
  reading: { map: { product: { name: 'shop', idea: 'a place' }, spine: [], bands: [] } },
  at: 0,
};

const BOARD: Frame = { kind: 'board' };

const DOCS: Frame = { kind: 'docs', catalog: { groups: [] }, sel: 0, focus: 'catalog' };

describe('the standing watch would remember', () => {
  it('stands on the board with its chosen card', () => {
    expect(standingOf('kanban', [BOARD], 'K-2')).toStrictEqual({
      layout: 'kanban',
      chosen: 'K-2',
    });
  });

  it('keeps the layout the board wears', () => {
    expect(standingOf('backlog', [BOARD], 'K-2')).toStrictEqual({
      layout: 'backlog',
      chosen: 'K-2',
    });
  });

  it('leaves the seat out when no card is chosen', () => {
    expect(standingOf('kanban', [BOARD], undefined)).toStrictEqual({ layout: 'kanban' });
  });

  it('stands on the journey the stack holds open', () => {
    expect(standingOf('kanban', [BOARD, journeyFrame('K-1', 'artifacts')], 'K-2')).toStrictEqual({
      layout: 'kanban',
      chosen: 'K-2',
      stage: { kind: 'journey', key: 'K-1', tab: 'artifacts' },
    });
  });

  it('stands on the deepest journey when one opened another', () => {
    const frames = [BOARD, journeyFrame('K-1', 'artifacts'), journeyFrame('K-2', 'overview')];

    expect(standingOf('kanban', frames, undefined).stage).toStrictEqual({
      kind: 'journey',
      key: 'K-2',
      tab: 'overview',
    });
  });

  it('stands on the journey beneath an opened surface', () => {
    const frames = [BOARD, journeyFrame('K-1', 'artifacts'), SURFACE];

    expect(standingOf('kanban', frames, undefined).stage).toStrictEqual({
      kind: 'journey',
      key: 'K-1',
      tab: 'artifacts',
    });
  });

  it('stands on the map while the map is open', () => {
    expect(standingOf('kanban', [BOARD, MAP], undefined).stage).toStrictEqual({ kind: 'map' });
  });

  it('stands on the docs screen while the catalog is open', () => {
    expect(standingOf('kanban', [BOARD, DOCS], undefined).stage).toStrictEqual({ kind: 'docs' });
  });
});
