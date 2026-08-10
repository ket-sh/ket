import type { GateActionView } from '../../../shared/model';
import type { BoardLayout } from '../model/board-layout.ts';
import type { ShelfSpot } from './shelf.ts';
import type { BindingSpot, PaneStanding } from './spot.ts';

import { GATE_KEYS } from '../model/gate-keys.ts';

export type { BindingSpot, ShownWork } from './spot.ts';
export { shownWorkOf, spotOf } from './spot.ts';

type BindingGroup = 'move' | 'open' | 'filter' | 'tools';

export interface Binding {
  keys: string;
  action: string;
  group: BindingGroup;
}

const MOVE: Binding = { keys: '←↑↓→', action: 'move', group: 'move' };

const ESC_BOARD: Binding = { keys: 'esc', action: 'board', group: 'open' };

const QUIT: Binding = { keys: 'q', action: 'quit', group: 'open' };

function gateBindings(offers: GateActionView[]): Binding[] {
  return Object.entries(GATE_KEYS)
    .filter(([, action]) => offers.includes(action))
    .map(([keys, action]) => ({ keys, action, group: 'tools' as const }));
}

const NARROWS: Binding = { keys: '/', action: 'filter', group: 'filter' };

const GOES: Binding = { keys: 'ctrl+p', action: 'go', group: 'open' };

const HELPS: Binding = { keys: '?', action: 'help', group: 'tools' };

const DIVES: Binding = { keys: '⏎', action: 'journey', group: 'open' };

type BoardSpot = Extract<BindingSpot, { kind: 'board' }>;

function layoutSwaps(layout: BoardLayout): Binding[] {
  const laid = layout === 'kanban' ? 'list' : 'kanban';
  const queued = layout === 'backlog' ? 'board' : 'backlog';
  const shelved = layout === 'archive' ? 'board' : 'archive';

  return [
    { keys: 'v', action: laid, group: 'open' },
    { keys: 'b', action: queued, group: 'open' },
    { keys: 'x', action: shelved, group: 'open' },
  ];
}

function narrowable(layout: BoardLayout): boolean {
  return layout !== 'backlog' && layout !== 'archive';
}

function shelved(layout: BoardLayout, shelf: ShelfSpot): boolean {
  return layout === 'backlog' && shelf.rows + shelf.unassigned > 0;
}

function promotes(layout: BoardLayout, shelf: ShelfSpot): Binding[] {
  return layout === 'backlog' && shelf.rows > 0
    ? [{ keys: 'p', action: 'promote', group: 'tools' }]
    : [];
}

function shelfSwaps(layout: BoardLayout, shelf: ShelfSpot): Binding[] {
  return shelved(layout, shelf)
    ? [{ keys: 'u', action: shelf.whole ? 'release' : 'unassigned', group: 'open' }]
    : [];
}

function boardBindings({ layout, offers, holds, shelf }: BoardSpot): Binding[] {
  return [
    ...(holds ? [MOVE, DIVES] : []),
    ...gateBindings(offers),
    ...promotes(layout, shelf),
    { keys: 'm', action: 'map', group: 'open' },
    ...layoutSwaps(layout),
    ...shelfSwaps(layout, shelf),
    { keys: 'l', action: 'log', group: 'open' },
    { keys: 'd', action: 'docs', group: 'open' },
    ...(holds && narrowable(layout) ? [NARROWS] : []),
    GOES,
    HELPS,
    { keys: 'r', action: 'refresh', group: 'tools' },
    QUIT,
  ];
}

const JOURNEY_MOVES: Record<PaneStanding, Binding[]> = {
  canvas: [MOVE, { keys: '⏎', action: 'open', group: 'open' }],
  brink: [
    MOVE,
    { keys: '→', action: 'item pane', group: 'move' },
    { keys: '⏎', action: 'open', group: 'open' },
  ],
  held: [
    { keys: '←', action: 'canvas', group: 'move' },
    { keys: '⏎', action: 'children', group: 'open' },
  ],
  tabs: [
    { keys: '←→', action: 'tabs', group: 'move' },
    { keys: '↓', action: 'panel', group: 'move' },
  ],
  reading: [
    { keys: '↑↓ j k', action: 'read', group: 'move' },
    { keys: '←', action: 'files', group: 'move' },
  ],
  preview: [{ keys: '↑↓ j k', action: 'scroll', group: 'move' }],
};

const SPLITS: Binding = { keys: 'f', action: 'split', group: 'open' };

const FILLS: Binding = { keys: 'f', action: 'full', group: 'open' };

type JourneySpot = Extract<BindingSpot, { kind: 'journey' }>;

function journeyBindings(spot: JourneySpot): Binding[] {
  return [
    ...JOURNEY_MOVES[spot.pane],
    ...gateBindings(spot.offers),
    spot.wide ? SPLITS : FILLS,
    ...WAYS_OUT,
  ];
}

const HELD_SCREENS: Record<'surface' | 'gate' | 'edit', Binding[]> = {
  surface: [
    { keys: '↑↓', action: 'scroll', group: 'move' },
    { keys: 'tab ←→', action: 'audience', group: 'tools' },
    { keys: 'e', action: 'edit', group: 'tools' },
    GOES,
    HELPS,
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

const WAYS_OUT: Binding[] = [GOES, HELPS, ESC_BOARD, QUIT];

const SHOWN_WORK: Record<'oplog' | 'map' | 'docs', Binding[]> = {
  oplog: [
    { keys: '↑↓', action: 'move', group: 'move' },
    { keys: '⏎', action: 'journey', group: 'open' },
    NARROWS,
  ],
  map: [MOVE],
  docs: [
    { keys: '↑↓', action: 'move', group: 'move' },
    { keys: '⏎', action: 'detail', group: 'open' },
  ],
};

const DETAIL_WAYS: Binding[] = [
  { keys: '↑↓', action: 'move', group: 'move' },
  { keys: 'esc', action: 'catalog', group: 'open' },
  GOES,
  HELPS,
  QUIT,
];

type DocsSpot = Extract<BindingSpot, { kind: 'docs' }>;

function workedOrOut(spot: Extract<BindingSpot, { kind: 'oplog' | 'map' | 'docs' }>): Binding[] {
  return [...(spot.holds ? SHOWN_WORK[spot.kind] : []), ...WAYS_OUT];
}

function docsBindings(spot: DocsSpot): Binding[] {
  return spot.focus === 'detail' ? DETAIL_WAYS : workedOrOut(spot);
}

const ANSWERED_GATE: Binding[] = [{ keys: 'esc', action: 'close', group: 'open' }];

function ceremonyBindings(spot: Extract<BindingSpot, { kind: 'gate' }>): Binding[] {
  return spot.asks ? HELD_SCREENS.gate : ANSWERED_GATE;
}

function heldBindings(spot: Exclude<BindingSpot, BoardSpot | DocsSpot>): Binding[] {
  if (spot.kind === 'oplog' || spot.kind === 'map') {
    return workedOrOut(spot);
  }

  if (spot.kind === 'journey') {
    return journeyBindings(spot);
  }

  return spot.kind === 'gate' ? ceremonyBindings(spot) : HELD_SCREENS[spot.kind];
}

export function bindingsAt(spot: BindingSpot): Binding[] {
  if (spot.kind === 'board') {
    return boardBindings(spot);
  }

  return spot.kind === 'docs' ? docsBindings(spot) : heldBindings(spot);
}

export function hintOf(binding: Binding): string {
  return binding.action === '' ? binding.keys : `${binding.keys} ${binding.action}`;
}

export interface GroupedBindings {
  group: BindingGroup;
  bindings: Binding[];
}

const GROUP_ORDER: BindingGroup[] = ['move', 'open', 'filter', 'tools'];

export function groupedOf(bindings: Binding[]): GroupedBindings[] {
  return GROUP_ORDER.flatMap((group) => {
    const worn = bindings.filter((binding) => binding.group === group);

    return worn.length === 0 ? [] : [{ group, bindings: worn }];
  });
}
