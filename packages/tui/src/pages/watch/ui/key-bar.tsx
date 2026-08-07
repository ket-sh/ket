import type { ReactNode } from 'react';

import type { GateActionView } from '../../../shared/model';
import type { Frame } from '../model/frames.ts';
import type { BoardLayout } from '../model/keys.ts';

import { useTheme } from '../../../shared/theme';
import { GATE_KEYS } from '../model/keys.ts';

const HINTS: Record<Exclude<Frame['kind'], 'board'>, string> = {
  journey: '←↑↓→ move · ⏎ open · esc board · q quit',
  surface: '↑↓ scroll · tab ←→ audience · e edit · esc back · q quit',
  gate: '⏎ pass · esc cancel',
  edit: 'type · ctrl+s save · esc back',
};

function gateHints(offers: GateActionView[]): string {
  return Object.entries(GATE_KEYS)
    .filter(([, action]) => offers.includes(action))
    .map(([key, action]) => ` · ${key} ${action}`)
    .join('');
}

function hintOf(kind: Frame['kind'], offers: GateActionView[], layout: BoardLayout): string {
  if (kind === 'board') {
    const other = layout === 'kanban' ? 'list' : 'kanban';

    return `←↑↓→ move · ⏎ journey${gateHints(offers)} · v ${other} · r refresh · q quit`;
  }

  return HINTS[kind];
}

export function KeyBar({
  kind,
  offers,
  layout,
}: {
  kind: Frame['kind'];
  offers: GateActionView[];
  layout: BoardLayout;
}): ReactNode {
  const { theme } = useTheme();

  return (
    <text wrapMode="none" fg={theme.overlay}>
      {hintOf(kind, offers, layout)}
    </text>
  );
}
