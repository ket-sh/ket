import type { ReactNode } from 'react';

import type { GateActionView } from '../../../shared/model';
import type { BoardLayout } from '../model/board-layout.ts';
import type { Frame } from '../model/frames.ts';

import { widthOf } from '../../../shared/lib';
import { useTheme } from '../../../shared/theme';
import { bindingsAt, hintOf, spotOf } from '../lib/bindings.ts';

const SEPARATOR = ' · ';

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

export function KeyBar({
  frame,
  offers,
  layout,
  width,
  narrowed,
}: {
  frame: Frame;
  offers: GateActionView[];
  layout: BoardLayout;
  width: number;
  narrowed: string | undefined;
}): ReactNode {
  const { theme } = useTheme();
  const bound = bindingsAt(spotOf(frame, layout, offers)).map((binding) => hintOf(binding));
  const hints = narrowed === undefined ? bound : [`/ ${narrowed}`, ...bound];

  return (
    <text wrapMode="none" fg={theme.overlay}>
      {fittedInto(hints, width)}
    </text>
  );
}
