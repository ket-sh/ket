import type { MouseEvent, TextRenderable } from '@opentui/core';
import type { ReactNode } from 'react';

import { useRef } from 'react';

import type { GateActionView } from '../../../shared/model';
import type { BoardLayout } from '../model/board-layout.ts';
import type { Pressed } from '../model/compass.ts';
import type { Frame } from '../model/frames.ts';
import type { WatchMouse } from '../model/mouse.ts';

import { widthOf } from '../../../shared/lib';
import { useTheme } from '../../../shared/theme';
import { bindingsAt, hintOf, spotOf } from '../lib/bindings.ts';
import { hintIndexAt, keptAt, pressedOf, rowOf, SEPARATOR } from '../lib/hints.ts';

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
      <BandedHints kept={kept} width={width} />
    </text>
  );
}

function BandedHints({ kept, width }: { kept: HintEntry[]; width: number }): ReactNode {
  const { theme } = useTheme();
  const band = theme.surface0;
  const room = Math.max(0, width - widthOf(rowOf(kept.map((entry) => entry.hint))) - 1);

  return (
    <>
      {kept.flatMap((entry, at) => [
        ...(at === 0
          ? []
          : [
              <span key={`between ${entry.hint}`} fg={theme.overlay} bg={band}>
                {SEPARATOR}
              </span>,
            ]),
        <span key={`keys ${entry.hint}`} fg={theme.blue} bg={band}>
          {entry.keys}
        </span>,
        <span key={`says ${entry.hint}`} fg={theme.subtext} bg={band}>
          {entry.hint.slice(entry.keys.length)}
        </span>,
      ])}
      <span bg={band}>{' '.repeat(room)}</span>
    </>
  );
}
