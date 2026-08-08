import type { MouseEvent, TextRenderable } from '@opentui/core';
import type { ReactNode } from 'react';

import { useRef } from 'react';

import type { GateActionView } from '../../../shared/model';
import type { BoardLayout } from '../model/board-layout.ts';
import type { Pressed } from '../model/compass.ts';
import type { Frame } from '../model/frames.ts';
import type { WatchMouse } from '../model/mouse.ts';

import { useTheme } from '../../../shared/theme';
import { bindingsAt, hintOf, spotOf } from '../lib/bindings.ts';
import { hintIndexAt, keptAt, pressedOf, rowOf } from '../lib/hints.ts';

interface HintEntry {
  hint: string;
  keys: string;
}

function entriesOf(
  frame: Frame,
  offers: GateActionView[],
  layout: BoardLayout,
  narrowed: string | undefined,
): HintEntry[] {
  const bound = bindingsAt(spotOf(frame, layout, offers)).map((binding) => ({
    hint: hintOf(binding),
    keys: binding.keys,
  }));

  return narrowed === undefined ? bound : [{ hint: `/ ${narrowed}`, keys: '/' }, ...bound];
}

function pressedAt(kept: HintEntry[], column: number): Pressed | undefined {
  const at = hintIndexAt(
    kept.map((entry) => entry.hint),
    column,
  );
  const keys = at === undefined ? undefined : kept[at]?.keys;

  return keys === undefined ? undefined : pressedOf(keys);
}

export function KeyBar({
  frame,
  offers,
  layout,
  width,
  narrowed,
  mouse,
}: {
  frame: Frame;
  offers: GateActionView[];
  layout: BoardLayout;
  width: number;
  narrowed: string | undefined;
  mouse: WatchMouse;
}): ReactNode {
  const { theme } = useTheme();
  const rowRef = useRef<TextRenderable>(null);
  const entries = entriesOf(frame, offers, layout, narrowed);
  const kept = keptAt(
    entries.map((entry) => entry.hint),
    width,
  ).flatMap((at) => (entries[at] === undefined ? [] : [entries[at]]));

  const pressAt = (event: MouseEvent): void => {
    const pressed = pressedAt(kept, event.x - (rowRef.current?.x ?? 0));

    if (pressed !== undefined) {
      event.stopPropagation();
      mouse.hint(pressed);
    }
  };

  return (
    <text ref={rowRef} wrapMode="none" fg={theme.overlay} onMouseDown={pressAt}>
      {rowOf(kept.map((entry) => entry.hint))}
    </text>
  );
}
