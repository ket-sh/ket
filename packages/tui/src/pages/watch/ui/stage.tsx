import type { ReactNode } from 'react';

import type { KanbanColumnView, OplogEventView, UnfiledShelfView } from '../../../shared/model';
import type { BoardLayout } from '../model/board-layout.ts';
import type { FrameStack } from '../model/frames.ts';
import type { WatchMouse } from '../model/mouse.ts';
import type { Seat } from '../model/seat.ts';
import type { ShelfSeat } from '../model/shelf-seat.ts';

import { MapPane } from '../../../widgets/story-map';
import { BoardView } from './board.tsx';
import { DocsView } from './docs.tsx';
import { EditorPage } from './editor.tsx';
import { JourneyPage } from './journey.tsx';
import { ListView } from './list.tsx';
import { OplogView } from './oplog.tsx';
import { ArchiveView, BacklogView } from './shelves.tsx';
import { SurfacePage } from './surface.tsx';

export const PAGE_SIDE = 1;

export interface RoomProps {
  stack: FrameStack;
  columns: KanbanColumnView[];
  unfiled: UnfiledShelfView;
  shelfSeat: ShelfSeat;
  logRows: OplogEventView[];
  seat: Seat;
  now: string;
  tick: number;
  width: number;
  height: number;
  layout: BoardLayout;
  calm: boolean;
  totals: Map<string, number>;
  mouse: WatchMouse;
}

type BoardAreaProps = Omit<RoomProps, 'stack'>;

const BOARD_AREAS: Record<BoardLayout, (held: BoardAreaProps) => ReactNode> = {
  backlog: ({ columns, unfiled, shelfSeat, now, seat, mouse }): ReactNode => (
    <BacklogView
      columns={columns}
      unfiled={unfiled}
      shelfSeat={shelfSeat}
      now={now}
      chosenKey={seat.chosen?.key}
      mouse={mouse}
    />
  ),
  archive: ({ columns, now, seat, mouse }): ReactNode => (
    <ArchiveView columns={columns} now={now} chosenKey={seat.chosen?.key} mouse={mouse} />
  ),
  list: ({ columns, now, seat, mouse }): ReactNode => (
    <ListView
      columns={columns}
      now={now}
      chosenKey={seat.chosen?.key}
      onRow={mouse.listRow}
      onWheel={mouse.listWheel}
    />
  ),
  kanban: ({ columns, now, width, tick, seat, totals, mouse }): ReactNode => (
    <BoardView
      columns={columns}
      now={now}
      room={width - PAGE_SIDE * 2}
      tick={tick}
      seat={seat}
      totals={totals}
      mouse={mouse}
    />
  ),
};

function BoardArea(held: BoardAreaProps): ReactNode {
  return BOARD_AREAS[held.layout](held);
}

function heldPageOf(room: RoomProps): ReactNode | undefined {
  const { stack, now, tick, width, height } = room;

  if (stack.top.kind === 'edit') {
    return <EditorPage frame={stack.top} tick={tick} height={height} />;
  }

  if (stack.top.kind === 'oplog') {
    return (
      <OplogView
        shown={room.logRows}
        sel={stack.top.sel}
        now={now}
        height={height}
        mouse={room.mouse}
      />
    );
  }

  if (stack.top.kind === 'docs') {
    return (
      <DocsView
        catalog={stack.top.catalog}
        sel={stack.top.sel}
        focus={stack.top.focus}
        now={now}
        width={width}
        height={height}
        mouse={room.mouse}
      />
    );
  }

  return undefined;
}

export function StageArea(room: RoomProps): ReactNode {
  const { stack, now, tick, width, height, mouse } = room;
  const held = heldPageOf(room);

  if (held !== undefined) {
    return held;
  }

  if (stack.top.kind === 'map') {
    return (
      <MapPane
        reading={stack.top.reading}
        at={stack.top.at}
        onSeat={mouse.mapSeat}
        onWheel={mouse.mapWheel}
      />
    );
  }

  if (stack.top.kind === 'journey') {
    return (
      <JourneyPage
        journey={stack.top.journey}
        sel={stack.top.sel}
        tab={stack.top.tab}
        pick={stack.top.pick}
        focus={stack.top.focus}
        cur={stack.top.cur}
        aud={stack.top.aud}
        wide={stack.top.wide}
        live={room.calm}
        now={now}
        tick={tick}
        width={width - 2}
        height={height}
        mouse={mouse}
      />
    );
  }

  if (stack.top.kind === 'surface') {
    return <SurfacePage frame={stack.top} height={height} mouse={mouse} />;
  }

  return <BoardArea {...room} />;
}
