import type { ReactNode } from 'react';

import type { KanbanColumnView } from '../../../shared/model';
import type { BoardLayout } from '../model/board-layout.ts';
import type { Filter } from '../model/filter.ts';
import type { Frame, FrameStack } from '../model/frames.ts';
import type { Seat } from '../model/seat.ts';

import { FilterBar } from './filter-bar.tsx';
import { KeyBar } from './key-bar.tsx';

function cardsIn(columns: KanbanColumnView[]): number {
  return columns.reduce((count, column) => count + column.cards.length, 0);
}

function narrowedWorn(filter: Filter, frame: Frame): string | undefined {
  if (frame.kind !== 'board' || filter.typing || filter.query === '') {
    return undefined;
  }

  return filter.query;
}

export function FootRow({
  filter,
  shown,
  columns,
  stack,
  seat,
  layout,
  width,
}: {
  filter: Filter;
  shown: KanbanColumnView[];
  columns: KanbanColumnView[];
  stack: FrameStack;
  seat: Seat;
  layout: BoardLayout;
  width: number;
}): ReactNode {
  return (
    <box flexDirection="column">
      {filter.typing ? (
        <FilterBar query={filter.query} kept={cardsIn(shown)} all={cardsIn(columns)} />
      ) : null}
      <KeyBar
        frame={stack.top}
        offers={seat.chosen?.offers ?? []}
        layout={layout}
        width={width}
        narrowed={narrowedWorn(filter, stack.top)}
      />
    </box>
  );
}
