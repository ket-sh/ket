import type { ReactNode } from 'react';

import { useKeyboard, useTerminalDimensions } from '@opentui/react';
import { useEffect, useState } from 'react';

import type { BoardFeed, KanbanColumnView } from '../../../shared/model';
import type { FrameStack } from '../model/frames.ts';
import type { BoardLayout, Picker, PressDeps } from '../model/keys.ts';
import type { Seat } from '../model/seat.ts';

import { lerpHex } from '../../../shared/lib';
import { ThemeProvider, THEMES, useTheme } from '../../../shared/theme';
import { Banner } from '../../../shared/ui';
import { laidInRow } from '../lib/lanes.ts';
import { useBoardState } from '../model/board-state.ts';
import { crumbOf, outstayed } from '../model/frames.ts';
import { press } from '../model/keys.ts';
import { useSeat } from '../model/seat.ts';
import { useFrameStack } from '../model/stack.ts';
import { BoardView } from './board.tsx';
import { EditorPage } from './editor.tsx';
import { GateModal } from './gate.tsx';
import { JourneyPage } from './journey.tsx';
import { KeyBar } from './key-bar.tsx';
import { ListView } from './list.tsx';
import { SurfacePage, surfaceMost } from './surface.tsx';
import { ThemePicker } from './theme.tsx';

const PAGE_SIDE = 1;

const CHROME = 6;

export interface WatchPageProps {
  feed: BoardFeed;
  onQuit: () => void;
  clock?: () => string;
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

function HeaderRow({ stack, tick }: { stack: FrameStack; tick: number }): ReactNode {
  const { theme, name } = useTheme();
  const beat = lerpHex(theme.green, theme.base, tick % 8 < 4 ? 0.1 : 0.5);

  return (
    <box flexDirection="row" justifyContent="space-between">
      <text wrapMode="none">
        <span fg={beat}>{'● '}</span>
        <span fg={theme.gray}>{crumbOf(stack.frames)}</span>
      </text>
      <text wrapMode="none" fg={theme.subtext}>
        {name}
      </text>
    </box>
  );
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

  if (stack.top.kind === 'journey') {
    return (
      <JourneyPage
        journey={stack.top.journey}
        sel={stack.top.sel}
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

function usePicker(stack: FrameStack): Picker {
  const wardrobe = useTheme();
  const [at, setAt] = useState<number | undefined>(undefined);

  const open = (): void => {
    if (stack.top.kind !== 'gate') {
      setAt(THEMES.findIndex(([name]) => name === wardrobe.name));
    }
  };

  const move = (delta: number): void => {
    const landing = Math.min(Math.max((at ?? 0) + delta, 0), THEMES.length - 1);

    setAt(landing);
    wardrobe.preview(landing);
  };

  const keep = (): void => {
    if (at !== undefined) {
      wardrobe.keep(at);
    }

    setAt(undefined);
  };

  const close = (): void => {
    wardrobe.revert();
    setAt(undefined);
  };

  return { at, open, move, keep, close };
}

function useWatchKeys(deps: PressDeps): void {
  useKeyboard((key) => {
    press({ name: key.name, seq: key.sequence, ctrl: key.ctrl }, deps);
  });
}

function WatchRoom({
  feed,
  onQuit,
  clock = () => new Date().toISOString(),
}: WatchPageProps): ReactNode {
  const { columns, now, tick, refresh } = useBoardState(feed, clock);
  const stack = useFrameStack(feed);
  const seat = useSeat(columns);
  const { width, height } = useTerminalDimensions();
  const [layout, setLayout] = useState<BoardLayout>('kanban');
  const picker = usePicker(stack);
  const most = stack.top.kind === 'surface' ? surfaceMost(stack.top, height - CHROME) : 0;
  const swap = (): void => {
    setLayout((worn) => (worn === 'kanban' ? 'list' : 'kanban'));
  };

  useCeremonyCurtain(stack, tick);
  useMovedCardFollow(stack, seat, columns);
  useWatchKeys({ onQuit, refresh, stack, seat, most, tick, layout, swap, picker });

  return (
    <box
      flexDirection="column"
      height={height}
      paddingTop={1}
      paddingLeft={PAGE_SIDE}
      paddingRight={PAGE_SIDE}
    >
      <Banner tick={tick} />
      <HeaderRow stack={stack} tick={tick} />
      <box flexDirection="column" flexGrow={1} overflow="hidden">
        <StageArea
          stack={stack}
          columns={columns}
          seat={seat}
          now={now}
          tick={tick}
          width={width}
          height={height - CHROME}
          layout={layout}
        />
      </box>
      <KeyBar kind={stack.top.kind} offers={seat.chosen?.offers ?? []} layout={layout} />
      <CeremonyOverlay stack={stack} columns={columns} tick={tick} width={width} height={height} />
      <PickerOverlay picker={picker} width={width} height={height} />
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
