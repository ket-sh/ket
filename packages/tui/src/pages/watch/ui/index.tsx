import type { ReactNode } from 'react';

import { useKeyboard, useTerminalDimensions } from '@opentui/react';
import { useEffect, useState } from 'react';

import type { BoardFeed, GateActionView, KanbanColumnView } from '../../../shared/model';
import type { Frame, FrameStack } from '../model/frames.ts';
import type { BoardLayout, Picker, PressDeps } from '../model/keys.ts';
import type { Seat } from '../model/seat.ts';

import { ThemeProvider, THEMES, useTheme } from '../../../shared/theme';
import { useBoardState } from '../model/board-state.ts';
import { crumbOf, outstayed } from '../model/frames.ts';
import { GATE_KEYS, press } from '../model/keys.ts';
import { livedIn, useSeat } from '../model/seat.ts';
import { useFrameStack } from '../model/stack.ts';
import { BoardView } from './board.tsx';
import { EditorPage } from './editor.tsx';
import { GateModal } from './gate.tsx';
import { JourneyPage } from './journey.tsx';
import { ListView } from './list.tsx';
import { SurfacePage, surfaceMost } from './surface.tsx';
import { ThemePicker } from './theme.tsx';

const NARROW = 80;

export interface WatchPageProps {
  feed: BoardFeed;
  onQuit: () => void;
  clock?: () => string;
}

const HINTS: Record<Exclude<Frame['kind'], 'board'>, string> = {
  journey: '←↑↓→ move · ⏎ open · esc board · q quit',
  surface: '↑↓ scroll · tab ←→ audience · e edit · esc back · q quit',
  gate: '⏎ pass · esc cancel',
  edit: 'type · ctrl+s save · esc back',
};

function gateHints(offers: GateActionView[]): string {
  return Object.entries(GATE_KEYS)
    .filter(([, action]) => offers.includes(action))
    .map(([key, action]) => ` · ${key} ${action}`)
    .join('');
}

function hintOf(kind: Frame['kind'], offers: GateActionView[], layout: BoardLayout): string {
  if (kind === 'board') {
    const other = layout === 'kanban' ? 'list' : 'kanban';

    return `←↑↓→ move · ⏎ journey${gateHints(offers)} · v ${other} · r refresh · q quit`;
  }

  return HINTS[kind];
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

function HeaderRow({
  stack,
  seat,
  layout,
}: {
  stack: FrameStack;
  seat: Seat;
  layout: BoardLayout;
}): ReactNode {
  const { theme, name } = useTheme();

  return (
    <box flexDirection="row" justifyContent="space-between">
      <text wrapMode="none">
        <strong>ket</strong>
        <span fg={theme.gray}>{`  ${crumbOf(stack.frames)}`}</span>
      </text>
      <text wrapMode="none">
        <span fg={theme.subtext}>{name}</span>
        <span
          fg={theme.overlay}
        >{`  ${hintOf(stack.top.kind, seat.chosen?.offers ?? [], layout)}`}</span>
      </text>
    </box>
  );
}

interface RoomProps {
  stack: FrameStack;
  lived: KanbanColumnView[];
  seat: Seat;
  now: string;
  tick: number;
  width: number;
  height: number;
  layout: BoardLayout;
}

function BoardArea({ lived, seat, now, width, layout }: Omit<RoomProps, 'stack'>): ReactNode {
  if (layout === 'list') {
    return <ListView lived={lived} now={now} chosenKey={seat.chosen?.key} />;
  }

  return <BoardView lived={lived} now={now} wide={width >= NARROW} seat={seat} />;
}

function StageArea(room: RoomProps): ReactNode {
  const { stack, now, tick, width, height } = room;

  if (stack.top.kind === 'edit') {
    return <EditorPage frame={stack.top} tick={tick} height={height - 3} />;
  }

  if (stack.top.kind === 'journey') {
    return (
      <JourneyPage
        journey={stack.top.journey}
        sel={stack.top.sel}
        now={now}
        tick={tick}
        width={width - 2}
        height={height - 3}
      />
    );
  }

  if (stack.top.kind === 'surface') {
    return <SurfacePage frame={stack.top} height={height - 3} />;
  }

  return <BoardArea {...room} />;
}

function CeremonyOverlay({
  stack,
  columns,
  tick,
  width,
  height,
}: Omit<RoomProps, 'lived' | 'seat' | 'now' | 'layout'> & {
  columns: KanbanColumnView[];
}): ReactNode {
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
  const lived = livedIn(columns);
  const seat = useSeat(lived);
  const { width, height } = useTerminalDimensions();
  const [layout, setLayout] = useState<BoardLayout>('kanban');
  const picker = usePicker(stack);
  const most = stack.top.kind === 'surface' ? surfaceMost(stack.top, height - 3) : 0;
  const swap = (): void => {
    setLayout((worn) => (worn === 'kanban' ? 'list' : 'kanban'));
  };

  useCeremonyCurtain(stack, tick);
  useMovedCardFollow(stack, seat, columns);
  useWatchKeys({ onQuit, refresh, stack, seat, most, tick, layout, swap, picker });

  return (
    <box flexDirection="column" paddingTop={1} paddingLeft={1} paddingRight={1}>
      <HeaderRow stack={stack} seat={seat} layout={layout} />
      <StageArea
        stack={stack}
        lived={lived}
        seat={seat}
        now={now}
        tick={tick}
        width={width}
        height={height}
        layout={layout}
      />
      <CeremonyOverlay stack={stack} columns={columns} tick={tick} width={width} height={height} />
      {picker.at === undefined ? null : (
        <ThemePicker at={picker.at} width={width} height={height} />
      )}
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
