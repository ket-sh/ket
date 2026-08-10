import type { ReactNode } from 'react';

import { useTerminalDimensions } from '@opentui/react';

import type {
  BoardFeed,
  KanbanColumnView,
  OplogEventView,
  UnfiledShelfView,
} from '../../../shared/model';
import type { BoardLayout } from '../model/board-layout.ts';
import type { Ring } from '../model/chime.ts';
import type { Filter } from '../model/filter.ts';
import type { FrameStack } from '../model/frames.ts';
import type { Help } from '../model/help.ts';
import type { PressDeps } from '../model/keys.ts';
import type { WatchMouse } from '../model/mouse.ts';
import type { WatchView } from '../model/opening.ts';
import type { Palette } from '../model/palette.ts';
import type { Picker } from '../model/picker.ts';
import type { Seat } from '../model/seat.ts';
import type { RoomProps } from './stage.tsx';

import { ThemeProvider } from '../../../shared/theme';
import { Banner, Scheme, Sheet } from '../../../shared/ui';
import { shownWorkOf } from '../lib/bindings.ts';
import { laneTotalsOf } from '../lib/lanes.ts';
import { releaseShelfOf } from '../lib/shelf.ts';
import { standingOf } from '../lib/standing.ts';
import { useBoardLayout } from '../model/board-layout.ts';
import { useBoardState } from '../model/board-state.ts';
import { useChime } from '../model/chime.ts';
import { useHelp } from '../model/help.ts';
import { mouseOf } from '../model/mouse.ts';
import { useOpening, useRemember } from '../model/opening.ts';
import { usePalette } from '../model/palette.ts';
import { usePicker } from '../model/picker.ts';
import {
  calmOf,
  leavingOf,
  useCeremonyCurtain,
  useMovedCardFollow,
  useNarrowing,
  useWatchKeys,
} from '../model/room.ts';
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

const CHROME = 7;

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

function CeremonyOverlay({
  stack,
  columns,
  tick,
  width,
  height,
}: Omit<
  RoomProps,
  'seat' | 'now' | 'layout' | 'mouse' | 'logRows' | 'calm' | 'totals' | 'unfiled'
>): ReactNode {
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

interface Room {
  columns: KanbanColumnView[];
  unfiled: UnfiledShelfView;
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
  calm: boolean;
  totals: Map<string, number>;
  mouse: WatchMouse;
}

interface Rituals {
  columns: KanbanColumnView[];
  loaded: boolean;
  ring: Ring | undefined;
  opening: WatchView | undefined;
  wear: (landing: BoardLayout) => void;
  remember: ((view: WatchView) => void) | undefined;
  standing: WatchView;
  pressDeps: PressDeps;
}

function useWatchRituals(held: Rituals): void {
  const { stack, seat, tick } = held.pressDeps;

  useChime(held.columns, held.loaded, held.ring);
  useCeremonyCurtain(stack, tick);
  useMovedCardFollow(stack, seat, held.columns);
  useOpening(held.opening, held.loaded, { stack, seat, wear: held.wear });
  useRemember(held.remember, held.standing);
  useWatchKeys(held.pressDeps);
}

function useWatchRoom({
  feed,
  onQuit,
  clock = () => new Date().toISOString(),
  ring,
  opening,
  remember,
}: WatchPageProps): Room {
  const { columns, unfiled, loaded, now, tick, refresh } = useBoardState(feed, clock);
  const stack = useFrameStack(feed);
  const { width, height } = useTerminalDimensions();
  const { layout, swap, queue, shelve, wear } = useBoardLayout();
  const picker = usePicker(stack);
  const { filter, logFilter, shown, logRows } = useNarrowing(columns, layout, stack.top);
  const seat = useSeat(shown);
  const palette = usePalette({ columns, chosen: seat.chosen, stack, wear, picker, refresh, tick });
  const help = useHelp();
  const most = stack.top.kind === 'surface' ? surfaceMost(stack.top, height - CHROME) : 0;
  const standing = standingOf(layout, stack.frames, seat.chosen?.key);
  const leave = leavingOf(remember, standing, onQuit);
  const deps = { onQuit: leave, refresh, stack, seat, most, tick, layout, swap, queue, shelve };
  const pressDeps = { ...deps, picker, filter, logFilter, palette, help };
  const mouse = mouseOf(pressDeps);

  useWatchRituals({ columns, loaded, ring, opening, wear, remember, standing, pressDeps });

  return {
    calm: calmOf(picker, palette, help),
    totals: laneTotalsOf(columns),
    columns,
    unfiled,
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
  const { mouse, shown, logRows } = room;

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
        shown={shownWorkOf(shown, logRows, releaseShelfOf(room.unfiled))}
        width={width}
        height={height}
      />
    </>
  );
}

function FootLayer({ room }: { room: Room }): ReactNode {
  const { columns, shown, unfiled, logRows, stack, seat, layout, width, mouse } = room;

  return (
    <FootRow
      filter={room.filter}
      logFilter={room.logFilter}
      shown={shown}
      columns={columns}
      unfiled={unfiled}
      logRows={logRows}
      stack={stack}
      seat={seat}
      layout={layout}
      width={width - PAGE_SIDE * 2}
      mouse={mouse}
    />
  );
}

function WatchRoom(props: WatchPageProps): ReactNode {
  const room = useWatchRoom(props);
  const { shown, logRows, now, tick, stack, seat, layout, width, height, mouse } = room;
  const { unfiled } = room;

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
      <box flexDirection="column" flexGrow={1} flexBasis={0} overflow="hidden">
        <StageArea
          stack={stack}
          columns={shown}
          unfiled={unfiled}
          logRows={logRows}
          seat={seat}
          now={now}
          tick={tick}
          width={width}
          height={height - CHROME}
          layout={layout}
          calm={room.calm}
          totals={room.totals}
          mouse={mouse}
        />
      </box>
      <FootLayer room={room} />
      <OverlayLayer room={room} />
    </box>
  );
}

export function WatchPage(props: WatchPageProps): ReactNode {
  return (
    <ThemeProvider>
      <Scheme />
      <Sheet />
      <WatchRoom {...props} />
    </ThemeProvider>
  );
}
