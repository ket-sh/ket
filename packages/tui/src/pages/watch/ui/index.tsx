import type { ReactNode } from 'react';

import { useKeyboard, useTerminalDimensions } from '@opentui/react';
import { useEffect } from 'react';

import type { BoardFeed, KanbanColumnView } from '../../../shared/model';
import type { BoardLayout } from '../model/board-layout.ts';
import type { Ring } from '../model/chime.ts';
import type { Filter } from '../model/filter.ts';
import type { FrameStack } from '../model/frames.ts';
import type { PressDeps } from '../model/keys.ts';
import type { Palette } from '../model/palette.ts';
import type { Picker } from '../model/picker.ts';
import type { Seat } from '../model/seat.ts';

import { ThemeProvider } from '../../../shared/theme';
import { Banner } from '../../../shared/ui';
import { MapPane } from '../../../widgets/story-map';
import { narrowedBy } from '../lib/filter.ts';
import { laidInRow } from '../lib/lanes.ts';
import { useBoardLayout } from '../model/board-layout.ts';
import { useBoardState } from '../model/board-state.ts';
import { useChime } from '../model/chime.ts';
import { useFilter } from '../model/filter.ts';
import { outstayed } from '../model/frames.ts';
import { press } from '../model/keys.ts';
import { usePalette } from '../model/palette.ts';
import { usePicker } from '../model/picker.ts';
import { useSeat } from '../model/seat.ts';
import { useFrameStack } from '../model/stack.ts';
import { BacklogView } from './backlog.tsx';
import { BoardView } from './board.tsx';
import { EditorPage } from './editor.tsx';
import { FootRow } from './foot-row.tsx';
import { GateModal } from './gate.tsx';
import { HeaderRow } from './header-row.tsx';
import { JourneyPage } from './journey.tsx';
import { ListView } from './list.tsx';
import { PaletteOverlay } from './palette.tsx';
import { SurfacePage, surfaceMost } from './surface.tsx';
import { ThemePicker } from './theme.tsx';

const PAGE_SIDE = 1;

const CHROME = 6;

export interface WatchPageProps {
  feed: BoardFeed;
  onQuit: () => void;
  clock?: () => string;
  ring?: Ring;
}

function statusOf(columns: KanbanColumnView[], key: string): string | undefined {
  return columns.flatMap((column) => column.cards).find((card) => card.key === key)?.status;
}

function useCeremonyCurtain(stack: FrameStack, tick: number): void {
  useEffect(() => {
    if (outstayed(stack.top, tick)) {
      stack.pop();
    }
  }, [stack, tick]);
}

interface RoomProps {
  stack: FrameStack;
  columns: KanbanColumnView[];
  seat: Seat;
  now: string;
  tick: number;
  width: number;
  height: number;
  layout: BoardLayout;
}

function BoardArea({ columns, seat, now, width, layout }: Omit<RoomProps, 'stack'>): ReactNode {
  if (layout === 'backlog') {
    return <BacklogView columns={columns} chosenKey={seat.chosen?.key} />;
  }

  if (layout === 'list') {
    return <ListView columns={columns} now={now} chosenKey={seat.chosen?.key} />;
  }

  return (
    <BoardView
      columns={columns}
      now={now}
      inRow={laidInRow(columns, width - PAGE_SIDE * 2)}
      seat={seat}
    />
  );
}

function StageArea(room: RoomProps): ReactNode {
  const { stack, now, tick, width, height } = room;

  if (stack.top.kind === 'edit') {
    return <EditorPage frame={stack.top} tick={tick} height={height} />;
  }

  if (stack.top.kind === 'map') {
    return <MapPane reading={stack.top.reading} at={stack.top.at} />;
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
      />
    );
  }

  if (stack.top.kind === 'surface') {
    return <SurfacePage frame={stack.top} height={height} />;
  }

  return <BoardArea {...room} />;
}

function CeremonyOverlay({
  stack,
  columns,
  tick,
  width,
  height,
}: Omit<RoomProps, 'seat' | 'now' | 'layout'>): ReactNode {
  if (stack.top.kind !== 'gate') {
    return null;
  }

  return (
    <GateModal
      frame={stack.top}
      from={statusOf(columns, stack.top.cardKey)}
      tick={tick}
      width={width}
      height={height}
    />
  );
}

function PickerOverlay({
  picker,
  width,
  height,
}: {
  picker: Picker;
  width: number;
  height: number;
}): ReactNode {
  if (picker.at === undefined) {
    return null;
  }

  return <ThemePicker at={picker.at} width={width} height={height} />;
}

function useMovedCardFollow(stack: FrameStack, seat: Seat, columns: KanbanColumnView[]): void {
  useEffect(() => {
    if (stack.top.kind === 'gate' && stack.top.phase === 'pass') {
      seat.seek(stack.top.cardKey);
    }
  }, [columns, stack, seat]);
}

function useWatchKeys(deps: PressDeps): void {
  useKeyboard((key) => {
    press({ name: key.name, seq: key.sequence, ctrl: key.ctrl }, deps);
  });
}

interface Room {
  columns: KanbanColumnView[];
  shown: KanbanColumnView[];
  now: string;
  tick: number;
  stack: FrameStack;
  seat: Seat;
  layout: BoardLayout;
  picker: Picker;
  filter: Filter;
  palette: Palette;
  width: number;
  height: number;
}

function useWatchRoom({
  feed,
  onQuit,
  clock = () => new Date().toISOString(),
  ring,
}: WatchPageProps): Room {
  const { columns, loaded, now, tick, refresh } = useBoardState(feed, clock);
  const stack = useFrameStack(feed);
  const { width, height } = useTerminalDimensions();
  const { layout, swap, queue, wear } = useBoardLayout();
  const picker = usePicker(stack);
  const filter = useFilter();
  const shown = layout === 'backlog' ? columns : narrowedBy(columns, filter.query);
  const seat = useSeat(shown);
  const palette = usePalette({ columns, chosen: seat.chosen, stack, wear, picker, refresh, tick });
  const most = stack.top.kind === 'surface' ? surfaceMost(stack.top, height - CHROME) : 0;
  const deps = { onQuit, refresh, stack, seat, most, tick, layout, swap, queue };

  useChime(columns, loaded, ring);
  useCeremonyCurtain(stack, tick);
  useMovedCardFollow(stack, seat, columns);
  useWatchKeys({ ...deps, picker, filter, palette });

  return { columns, shown, now, tick, stack, seat, layout, picker, filter, palette, width, height };
}

function WatchRoom(props: WatchPageProps): ReactNode {
  const { columns, shown, now, tick, stack, seat, layout, picker, filter, palette, width, height } =
    useWatchRoom(props);

  return (
    <box
      flexDirection="column"
      height={height}
      paddingTop={1}
      paddingLeft={PAGE_SIDE}
      paddingRight={PAGE_SIDE}
    >
      <Banner />
      <HeaderRow stack={stack} tick={tick} />
      <box flexDirection="column" flexGrow={1} overflow="hidden">
        <StageArea
          stack={stack}
          columns={shown}
          seat={seat}
          now={now}
          tick={tick}
          width={width}
          height={height - CHROME}
          layout={layout}
        />
      </box>
      <FootRow
        filter={filter}
        shown={shown}
        columns={columns}
        stack={stack}
        seat={seat}
        layout={layout}
        width={width - PAGE_SIDE * 2}
      />
      <CeremonyOverlay stack={stack} columns={columns} tick={tick} width={width} height={height} />
      <PickerOverlay picker={picker} width={width} height={height} />
      <PaletteOverlay palette={palette} width={width} height={height} />
    </box>
  );
}

export function WatchPage(props: WatchPageProps): ReactNode {
  return (
    <ThemeProvider>
      <WatchRoom {...props} />
    </ThemeProvider>
  );
}
