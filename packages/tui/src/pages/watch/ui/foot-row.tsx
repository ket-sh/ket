import type { ReactNode } from 'react';

import type { KanbanColumnView, OplogEventView } from '../../../shared/model';
import type { ShelfSpot } from '../lib/shelf.ts';
import type { BoardLayout } from '../model/board-layout.ts';
import type { Filter } from '../model/filter.ts';
import type { Frame, FrameStack } from '../model/frames.ts';
import type { WatchMouse } from '../model/mouse.ts';
import type { Seat } from '../model/seat.ts';

import { shownWorkOf } from '../lib/bindings.ts';
import { FilterBar } from './filter-bar.tsx';
import { KeyBar } from './key-bar.tsx';

function cardsIn(columns: KanbanColumnView[]): number {
  return columns.reduce((count, column) => count + column.cards.length, 0);
}

function wornBy(narrower: Filter): string | undefined {
  return narrower.typing || narrower.query === '' ? undefined : narrower.query;
}

function narrowedWorn(filter: Filter, logFilter: Filter, frame: Frame): string | undefined {
  if (frame.kind === 'oplog') {
    return wornBy(logFilter);
  }

  return frame.kind === 'board' ? wornBy(filter) : undefined;
}

interface FootRowProps {
  filter: Filter;
  logFilter: Filter;
  shown: KanbanColumnView[];
  columns: KanbanColumnView[];
  shelf: ShelfSpot;
  logRows: OplogEventView[];
  stack: FrameStack;
  seat: Seat;
  layout: BoardLayout;
  width: number;
  mouse: WatchMouse;
}

interface Counted {
  narrower: Filter;
  kept: number;
  all: number;
}

function countedAt(top: Frame, foot: FootRowProps): Counted {
  if (top.kind === 'oplog') {
    return { narrower: foot.logFilter, kept: foot.logRows.length, all: top.events.length };
  }

  return { narrower: foot.filter, kept: cardsIn(foot.shown), all: cardsIn(foot.columns) };
}

export function FootRow(foot: FootRowProps): ReactNode {
  const { filter, logFilter, stack, seat, layout, width, mouse } = foot;
  const top = stack.top;
  const { narrower, kept, all } = countedAt(top, foot);

  return (
    <box flexDirection="column">
      {narrower.typing ? <FilterBar query={narrower.query} kept={kept} all={all} /> : null}
      <KeyBar
        frame={top}
        offers={seat.chosen?.offers ?? []}
        layout={layout}
        width={width}
        narrowed={narrowedWorn(filter, logFilter, top)}
        shown={shownWorkOf(foot.shown, foot.logRows, foot.shelf)}
        mouse={mouse}
      />
    </box>
  );
}
