import type { GateActionView } from '../../../shared/model';
import type { BoardLayout } from '../model/board-layout.ts';
import type { Frame } from '../model/frames.ts';

import { GATE_KEYS } from '../model/keys.ts';
import { neighborOf, placedOf } from './layout.ts';

type BindingGroup = 'move' | 'open' | 'filter' | 'tools';

export interface Binding {
  keys: string;
  action: string;
  group: BindingGroup;
}

type PaneStanding = 'canvas' | 'brink' | 'held';

export type BindingSpot =
  | { kind: 'board'; layout: BoardLayout; offers: GateActionView[] }
  | { kind: 'journey'; pane: PaneStanding }
  | { kind: 'map' }
  | { kind: 'surface' }
  | { kind: 'gate' }
  | { kind: 'edit' };

const MOVE: Binding = { keys: '←↑↓→', action: 'move', group: 'move' };

const ESC_BOARD: Binding = { keys: 'esc', action: 'board', group: 'open' };

const QUIT: Binding = { keys: 'q', action: 'quit', group: 'open' };

function gateBindings(offers: GateActionView[]): Binding[] {
  return Object.entries(GATE_KEYS)
    .filter(([, action]) => offers.includes(action))
    .map(([keys, action]) => ({ keys, action, group: 'tools' as const }));
}

const NARROWS: Binding = { keys: '/', action: 'filter', group: 'filter' };

function boardBindings(layout: BoardLayout, offers: GateActionView[]): Binding[] {
  const laid = layout === 'kanban' ? 'list' : 'kanban';
  const queued = layout === 'backlog' ? 'board' : 'backlog';

  return [
    MOVE,
    { keys: '⏎', action: 'journey', group: 'open' },
    ...gateBindings(offers),
    { keys: 'm', action: 'map', group: 'open' },
    { keys: 'v', action: laid, group: 'open' },
    { keys: 'b', action: queued, group: 'open' },
    ...(layout === 'backlog' ? [] : [NARROWS]),
    { keys: 'r', action: 'refresh', group: 'tools' },
    QUIT,
  ];
}

const JOURNEY_WAYS: Record<PaneStanding, Binding[]> = {
  canvas: [MOVE, { keys: '⏎', action: 'open', group: 'open' }, ESC_BOARD, QUIT],
  brink: [
    MOVE,
    { keys: '→', action: 'item pane', group: 'move' },
    { keys: '⏎', action: 'open', group: 'open' },
    ESC_BOARD,
    QUIT,
  ],
  held: [
    { keys: '←', action: 'canvas', group: 'move' },
    { keys: '⏎', action: 'children', group: 'open' },
    ESC_BOARD,
    QUIT,
  ],
};

const HELD_SCREENS: Record<'map' | 'surface' | 'gate' | 'edit', Binding[]> = {
  map: [MOVE, ESC_BOARD, QUIT],
  surface: [
    { keys: '↑↓', action: 'scroll', group: 'move' },
    { keys: 'tab ←→', action: 'audience', group: 'tools' },
    { keys: 'e', action: 'edit', group: 'tools' },
    { keys: 'esc', action: 'back', group: 'open' },
    QUIT,
  ],
  gate: [
    { keys: '⏎', action: 'pass', group: 'tools' },
    { keys: 'esc', action: 'cancel', group: 'open' },
  ],
  edit: [
    { keys: 'type', action: '', group: 'tools' },
    { keys: 'ctrl+s', action: 'save', group: 'tools' },
    { keys: 'esc', action: 'back', group: 'open' },
  ],
};

export function bindingsAt(spot: BindingSpot): Binding[] {
  if (spot.kind === 'board') {
    return boardBindings(spot.layout, spot.offers);
  }

  return spot.kind === 'journey' ? JOURNEY_WAYS[spot.pane] : HELD_SCREENS[spot.kind];
}

export function hintOf(binding: Binding): string {
  return binding.action === '' ? binding.keys : `${binding.keys} ${binding.action}`;
}

function paneStandingOf(frame: Extract<Frame, { kind: 'journey' }>): PaneStanding {
  if (frame.tab !== 'workflow' || frame.journey.children.length === 0) {
    return 'canvas';
  }

  if (frame.focus === 'pane') {
    return 'held';
  }

  const nodes = placedOf(frame.journey).nodes;

  return neighborOf(nodes, frame.sel, 'right') === frame.sel ? 'brink' : 'canvas';
}

const HELD_SPOTS: Record<'map' | 'surface' | 'gate' | 'edit', BindingSpot> = {
  map: { kind: 'map' },
  surface: { kind: 'surface' },
  gate: { kind: 'gate' },
  edit: { kind: 'edit' },
};

export function spotOf(frame: Frame, layout: BoardLayout, offers: GateActionView[]): BindingSpot {
  if (frame.kind === 'board') {
    return { kind: 'board', layout, offers };
  }

  if (frame.kind === 'journey') {
    return { kind: 'journey', pane: paneStandingOf(frame) };
  }

  return HELD_SPOTS[frame.kind];
}
