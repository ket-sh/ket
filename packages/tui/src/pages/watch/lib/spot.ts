import type { GateActionView, KanbanColumnView, OplogEventView } from '../../../shared/model';
import type { BoardLayout } from '../model/board-layout.ts';
import type { DocsFocus, Frame } from '../model/frames.ts';
import type { ShelfSpot } from './shelf.ts';

import { catalogRows } from './docs.ts';
import { neighborOf, placedOf } from './layout.ts';

export type PaneStanding = 'canvas' | 'brink' | 'held' | 'tabs' | 'reading' | 'preview';

export type BindingSpot =
  | {
      kind: 'board';
      layout: BoardLayout;
      offers: GateActionView[];
      holds: boolean;
      shelf: ShelfSpot;
    }
  | { kind: 'journey'; pane: PaneStanding; wide: boolean; offers: GateActionView[] }
  | { kind: 'docs'; focus: DocsFocus; holds: boolean }
  | { kind: 'map'; holds: boolean }
  | { kind: 'oplog'; holds: boolean }
  | { kind: 'surface' }
  | { kind: 'gate' }
  | { kind: 'edit' };

export interface ShownWork {
  cards: number;
  logged: number;
  shelf: ShelfSpot;
}

export function shownWorkOf(
  columns: KanbanColumnView[],
  logRows: OplogEventView[],
  shelf: ShelfSpot,
): ShownWork {
  return {
    cards: columns.reduce((count, column) => count + column.cards.length, 0),
    logged: logRows.length,
    shelf,
  };
}

const FOCUS_STANDING: Record<'pane' | 'tabs' | 'content', PaneStanding> = {
  pane: 'held',
  tabs: 'tabs',
  content: 'reading',
};

function workflowStandingOf(frame: Extract<Frame, { kind: 'journey' }>): PaneStanding {
  if (frame.tab !== 'workflow' || frame.journey.children.length === 0) {
    return 'canvas';
  }

  const nodes = placedOf(frame.journey).nodes;

  return neighborOf(nodes, frame.sel, 'right') === frame.sel ? 'brink' : 'canvas';
}

function paneStandingOf(frame: Extract<Frame, { kind: 'journey' }>): PaneStanding {
  if (frame.focus !== 'canvas') {
    return FOCUS_STANDING[frame.focus];
  }

  return frame.tab === 'overview' ? 'preview' : workflowStandingOf(frame);
}

function heldSpotOf(
  frame: Extract<Frame, { kind: 'docs' | 'map' | 'oplog' | 'surface' | 'gate' | 'edit' }>,
  shown: ShownWork,
): BindingSpot {
  if (frame.kind === 'docs') {
    return { kind: 'docs', focus: frame.focus, holds: catalogRows(frame.catalog).length > 0 };
  }

  if (frame.kind === 'map') {
    return { kind: 'map', holds: 'map' in frame.reading };
  }

  return frame.kind === 'oplog' ? { kind: 'oplog', holds: shown.logged > 0 } : { kind: frame.kind };
}

export function spotOf(
  frame: Frame,
  layout: BoardLayout,
  offers: GateActionView[],
  shown: ShownWork,
): BindingSpot {
  if (frame.kind === 'board') {
    return { kind: 'board', layout, offers, holds: shown.cards > 0, shelf: shown.shelf };
  }

  if (frame.kind === 'journey') {
    return {
      kind: 'journey',
      pane: paneStandingOf(frame),
      wide: frame.wide,
      offers: frame.journey.pane.offers,
    };
  }

  return heldSpotOf(frame, shown);
}
