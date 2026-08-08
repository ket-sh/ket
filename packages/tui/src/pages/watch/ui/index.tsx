import type { ReactNode } from 'react';

import { useKeyboard, useTerminalDimensions } from '@opentui/react';
import { useEffect } from 'react';

import type { BoardFeed, KanbanColumnView, OplogEventView } from '../../../shared/model';
import type { BoardLayout } from '../model/board-layout.ts';
import type { Ring } from '../model/chime.ts';
import type { Filter } from '../model/filter.ts';
import type { Frame, FrameStack } from '../model/frames.ts';
import type { Help } from '../model/help.ts';
import type { PressDeps } from '../model/keys.ts';
import type { WatchMouse } from '../model/mouse.ts';
import type { WatchView } from '../model/opening.ts';
import type { Palette } from '../model/palette.ts';
import type { Picker } from '../model/picker.ts';
import type { Seat } from '../model/seat.ts';
import type { RoomProps } from './stage.tsx';

import { ThemeProvider } from '../../../shared/theme';
import { Banner } from '../../../shared/ui';
import { narrowedBy } from '../lib/filter.ts';
import { narrowedEvents } from '../lib/oplog.ts';
import { standingOf } from '../lib/standing.ts';
import { useBoardLayout } from '../model/board-layout.ts';
import { useBoardState } from '../model/board-state.ts';
import { useChime } from '../model/chime.ts';
import { useFilter } from '../model/filter.ts';
import { outstayed } from '../model/frames.ts';
import { useHelp } from '../model/help.ts';
import { press } from '../model/keys.ts';
import { mouseOf } from '../model/mouse.ts';
import { useOpening, useRemember } from '../model/opening.ts';
import { usePalette } from '../model/palette.ts';
import { usePicker } from '../model/picker.ts';
import { useSeat } from '../model/seat.ts';
import { useFrameStack } from '../model/stack.ts';
import { FootRow } from './foot-row.tsx';
import { GateModal } from './gate.tsx';
import { HeaderRow } from './header-row.tsx';
import { HelpOverlay } from './help.tsx';
import { PaletteOverlay } from './palette.tsx';
import { PAGE_SIDE, StageArea } from './stage.tsx';
import { surfaceMost } from './surface.tsx';
import { ThemePicker } from './theme.tsx';

const CHROME = 6;

export interface WatchPageProps {
  feed: BoardFeed;
  onQuit: () => void;
  clock?: () => string;
  ring?: Ring;
  opening?: WatchView | undefined;
  remember?: ((view: WatchView) => void) | undefined;
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

function CeremonyOverlay({
  stack,
  columns,
  tick,
  width,
  height,
}: Omit<RoomProps, 'seat' | 'now' | 'layout' | 'mouse' | 'logRows'>): ReactNode {
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
  mouse,
}: {
  picker: Picker;
  width: number;
  height: number;
  mouse: WatchMouse;
}): ReactNode {
  if (picker.at === undefined) {
    return null;
  }

  return <ThemePicker at={picker.at} width={width} height={height} mouse={mouse} />;
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

interface Narrowing {
  filter: Filter;
  logFilter: Filter;
  shown: KanbanColumnView[];
  logRows: OplogEventView[];
}

function useNarrowing(columns: KanbanColumnView[], layout: BoardLayout, top: Frame): Narrowing {
  const filter = useFilter();
  const logFilter = useFilter();
  const shown = layout === 'backlog' ? columns : narrowedBy(columns, filter.query);
  const logRows = top.kind === 'oplog' ? narrowedEvents(top.events, logFilter.query) : [];

  return { filter, logFilter, shown, logRows };
}

function leavingOf(
  remember: ((view: WatchView) => void) | undefined,
  standing: WatchView,
  onQuit: () => void,
): () => void {
  return () => {
    remember?.(standing);
    onQuit();
  };
}

interface Room {
  columns: KanbanColumnView[];
  shown: KanbanColumnView[];
  logRows: OplogEventView[];
  now: string;
  tick: number;
  stack: FrameStack;
  seat: Seat;
  layout: BoardLayout;
  picker: Picker;
  filter: Filter;
  logFilter: Filter;
  palette: Palette;
  help: Help;
  width: number;
  height: number;
  mouse: WatchMouse;
}

function useWatchRoom({
  feed,
  onQuit,
  clock = () => new Date().toISOString(),
  ring,
  opening,
  remember,
}: WatchPageProps): Room {
  const { columns, loaded, now, tick, refresh } = useBoardState(feed, clock);
  const stack = useFrameStack(feed);
  const { width, height } = useTerminalDimensions();
  const { layout, swap, queue, wear } = useBoardLayout();
  const picker = usePicker(stack);
  const { filter, logFilter, shown, logRows } = useNarrowing(columns, layout, stack.top);
  const seat = useSeat(shown);
  const palette = usePalette({ columns, chosen: seat.chosen, stack, wear, picker, refresh, tick });
  const help = useHelp();
  const most = stack.top.kind === 'surface' ? surfaceMost(stack.top, height - CHROME) : 0;
  const standing = standingOf(layout, stack.frames, seat.chosen?.key);
  const leave = leavingOf(remember, standing, onQuit);
  const deps = { onQuit: leave, refresh, stack, seat, most, tick, layout, swap, queue };
  const pressDeps = { ...deps, picker, filter, logFilter, palette, help };
  const mouse = mouseOf(pressDeps);

  useChime(columns, loaded, ring);
  useCeremonyCurtain(stack, tick);
  useMovedCardFollow(stack, seat, columns);
  useOpening(opening, loaded, { stack, seat, wear });
  useRemember(remember, standing);
  useWatchKeys(pressDeps);

  return {
    columns,
    shown,
    logRows,
    now,
    tick,
    stack,
    seat,
    layout,
    picker,
    filter,
    logFilter,
    palette,
    help,
    width,
    height,
    mouse,
  };
}

function OverlayLayer({ room }: { room: Room }): ReactNode {
  const { columns, tick, stack, seat, layout, picker, palette, help, width, height } = room;
  const { mouse } = room;

  return (
    <>
      <CeremonyOverlay stack={stack} columns={columns} tick={tick} width={width} height={height} />
      <PickerOverlay picker={picker} width={width} height={height} mouse={mouse} />
      <PaletteOverlay palette={palette} width={width} height={height} mouse={mouse} />
      <HelpOverlay
        help={help}
        frame={stack.top}
        offers={seat.chosen?.offers ?? []}
        layout={layout}
        width={width}
        height={height}
      />
    </>
  );
}

function WatchRoom(props: WatchPageProps): ReactNode {
  const room = useWatchRoom(props);
  const { columns, shown, logRows, now, tick, stack, seat, layout, width, height, mouse } = room;
  const { filter, logFilter } = room;

  return (
    <box
      flexDirection="column"
      height={height}
      paddingTop={1}
      paddingLeft={PAGE_SIDE}
      paddingRight={PAGE_SIDE}
      onMouseDown={() => {
        mouse.outside();
      }}
    >
      <Banner />
      <HeaderRow stack={stack} tick={tick} />
      <box flexDirection="column" flexGrow={1} overflow="hidden">
        <StageArea
          stack={stack}
          columns={shown}
          logRows={logRows}
          seat={seat}
          now={now}
          tick={tick}
          width={width}
          height={height - CHROME}
          layout={layout}
          mouse={mouse}
        />
      </box>
      <FootRow
        filter={filter}
        logFilter={logFilter}
        shown={shown}
        columns={columns}
        logRows={logRows}
        stack={stack}
        seat={seat}
        layout={layout}
        width={width - PAGE_SIDE * 2}
        mouse={mouse}
      />
      <OverlayLayer room={room} />
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
