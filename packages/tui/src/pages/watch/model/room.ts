import { useKeyboard } from '@opentui/react';
import { useEffect } from 'react';

import type { KanbanColumnView, OplogEventView } from '../../../shared/model';
import type { BoardLayout } from './board-layout.ts';
import type { Filter } from './filter.ts';
import type { Frame, FrameStack } from './frames.ts';
import type { Help } from './help.ts';
import type { WatchView } from './opening.ts';
import type { Palette } from './palette.ts';
import type { Picker } from './picker.ts';
import type { PressDeps } from './press-deps.ts';
import type { Seat } from './seat.ts';

import { narrowedBy } from '../lib/filter.ts';
import { narrowedEvents } from '../lib/oplog.ts';
import { cappedShipped } from '../lib/shipped.ts';
import { useFilter } from './filter.ts';
import { outstayed } from './frames.ts';
import { press } from './keys.ts';

export function useCeremonyCurtain(stack: FrameStack, tick: number): void {
  useEffect(() => {
    if (outstayed(stack.top, tick)) {
      stack.pop();
    }
  }, [stack, tick]);
}

export function useMovedCardFollow(
  stack: FrameStack,
  seat: Seat,
  columns: KanbanColumnView[],
): void {
  useEffect(() => {
    if (stack.top.kind === 'gate' && stack.top.phase === 'pass') {
      seat.seek(stack.top.cardKey);
    }
  }, [columns, stack, seat]);
}

export function useWatchKeys(deps: PressDeps): void {
  useKeyboard((key) => {
    press({ name: key.name, seq: key.sequence, ctrl: key.ctrl }, deps);
  });
}

export interface Narrowing {
  filter: Filter;
  logFilter: Filter;
  shown: KanbanColumnView[];
  logRows: OplogEventView[];
}

export function useNarrowing(
  columns: KanbanColumnView[],
  layout: BoardLayout,
  top: Frame,
): Narrowing {
  const filter = useFilter();
  const logFilter = useFilter();
  const whole = layout === 'backlog' || layout === 'archive';
  const shown = whole ? columns : cappedShipped(narrowedBy(columns, filter.query));
  const logRows = top.kind === 'oplog' ? narrowedEvents(top.events, logFilter.query) : [];

  return { filter, logFilter, shown, logRows };
}

export function leavingOf(
  remember: ((view: WatchView) => void) | undefined,
  standing: WatchView,
  onQuit: () => void,
): () => void {
  return () => {
    remember?.(standing);
    onQuit();
  };
}

export function calmOf(picker: Picker, palette: Palette, help: Help): boolean {
  return picker.at === undefined && palette.at === undefined && !help.on;
}
