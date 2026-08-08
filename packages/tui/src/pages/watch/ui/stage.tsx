import type { ReactNode } from 'react';

import type { KanbanColumnView, OplogEventView } from '../../../shared/model';
import type { BoardLayout } from '../model/board-layout.ts';
import type { FrameStack } from '../model/frames.ts';
import type { WatchMouse } from '../model/mouse.ts';
import type { Seat } from '../model/seat.ts';

import { MapPane } from '../../../widgets/story-map';
import { laidInRow } from '../lib/lanes.ts';
import { BacklogView } from './backlog.tsx';
import { BoardView } from './board.tsx';
import { DocsView } from './docs.tsx';
import { EditorPage } from './editor.tsx';
import { JourneyPage } from './journey.tsx';
import { ListView } from './list.tsx';
import { OplogView } from './oplog.tsx';
import { SurfacePage } from './surface.tsx';

export const PAGE_SIDE = 1;

export interface RoomProps {
  stack: FrameStack;
  columns: KanbanColumnView[];
  logRows: OplogEventView[];
  seat: Seat;
  now: string;
  tick: number;
  width: number;
  height: number;
  layout: BoardLayout;
  mouse: WatchMouse;
}

function BoardArea({
  columns,
  seat,
  now,
  width,
  layout,
  mouse,
}: Omit<RoomProps, 'stack'>): ReactNode {
  if (layout === 'backlog') {
    return <BacklogView columns={columns} chosenKey={seat.chosen?.key} mouse={mouse} />;
  }

  if (layout === 'list') {
    return (
      <ListView
        columns={columns}
        now={now}
        chosenKey={seat.chosen?.key}
        onRow={mouse.listRow}
        onWheel={mouse.listWheel}
      />
    );
  }

  return (
    <BoardView
      columns={columns}
      now={now}
      inRow={laidInRow(columns, width - PAGE_SIDE * 2)}
      seat={seat}
      mouse={mouse}
    />
  );
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
      <DocsView frame={stack.top} now={now} width={width} height={height} mouse={room.mouse} />
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
        now={now}
        tick={tick}
        width={width - 2}
        height={height}
        mouse={mouse}
      />
    );
  }

  if (stack.top.kind === 'surface') {
    return <SurfacePage frame={stack.top} height={height} />;
  }

  return <BoardArea {...room} />;
}
