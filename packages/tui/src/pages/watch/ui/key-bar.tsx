import type { ReactNode } from 'react';

import type { GateActionView } from '../../../shared/model';
import type { Frame } from '../model/frames.ts';
import type { BoardLayout } from '../model/keys.ts';

import { widthOf } from '../../../shared/lib';
import { useTheme } from '../../../shared/theme';
import { neighborOf, placedOf } from '../lib/layout.ts';
import { GATE_KEYS } from '../model/keys.ts';

const HINTS: Record<Exclude<Frame['kind'], 'board'>, string> = {
  map: '←↑↓→ move · esc board · q quit',
  journey: '←↑↓→ move · ⏎ open · esc board · q quit',
  surface: '↑↓ scroll · tab ←→ audience · e edit · esc back · q quit',
  gate: '⏎ pass · esc cancel',
  edit: 'type · ctrl+s save · esc back',
};

const PANE_REACHABLE = '←↑↓→ move · → item pane · ⏎ open · esc board · q quit';

const PANE_HELD = '← canvas · ⏎ children · esc board · q quit';

const SEPARATOR = ' · ';

function gateHints(offers: GateActionView[]): string[] {
  return Object.entries(GATE_KEYS)
    .filter(([, action]) => offers.includes(action))
    .map(([key, action]) => `${key} ${action}`);
}

// The way out is the one hint the row can never lose, so a narrow terminal
// gives up the hints behind it instead, least useful first.
function fittedInto(hints: string[], room: number): string {
  const out = hints[hints.length - 1] ?? '';
  let kept = hints;

  while (kept.length > 1 && widthOf(kept.join(SEPARATOR)) > room) {
    kept = [...kept.slice(0, kept.length - 2), out];
  }

  return kept.join(SEPARATOR);
}

function boardHints(offers: GateActionView[], layout: BoardLayout): string[] {
  const laid = layout === 'kanban' ? 'list' : 'kanban';
  const queued = layout === 'backlog' ? 'board' : 'backlog';

  return [
    '←↑↓→ move',
    '⏎ journey',
    ...gateHints(offers),
    'm map',
    `v ${laid}`,
    `b ${queued}`,
    'r refresh',
    'q quit',
  ];
}

type Opened = Extract<Frame, { kind: 'journey' }>;

// A surface nobody can find is not reachable, so the hint appears exactly where
// the walk would land in the pane.
function journeyHint(frame: Opened): string {
  if (frame.tab !== 'workflow' || frame.journey.children.length === 0) {
    return HINTS.journey;
  }

  if (frame.focus === 'pane') {
    return PANE_HELD;
  }

  const nodes = placedOf(frame.journey).nodes;

  return neighborOf(nodes, frame.sel, 'right') === frame.sel ? PANE_REACHABLE : HINTS.journey;
}

function hintOf(frame: Frame, offers: GateActionView[], layout: BoardLayout, room: number): string {
  if (frame.kind === 'board') {
    return fittedInto(boardHints(offers, layout), room);
  }

  return frame.kind === 'journey' ? journeyHint(frame) : HINTS[frame.kind];
}

export function KeyBar({
  frame,
  offers,
  layout,
  width,
}: {
  frame: Frame;
  offers: GateActionView[];
  layout: BoardLayout;
  width: number;
}): ReactNode {
  const { theme } = useTheme();

  return (
    <text wrapMode="none" fg={theme.overlay}>
      {hintOf(frame, offers, layout, width)}
    </text>
  );
}
