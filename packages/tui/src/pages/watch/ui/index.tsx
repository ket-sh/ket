import type { ReactNode } from 'react';

import { useKeyboard, useTerminalDimensions } from '@opentui/react';
import { useEffect } from 'react';

import type { BoardFeed, GateActionView, KanbanColumnView } from '../../../shared/model';
import type { Frame, FrameStack } from '../model/frames.ts';
import type { Seat } from '../model/seat.ts';

import { useBoardState } from '../model/board-state.ts';
import { crumbOf, outstayed, useFrameStack } from '../model/frames.ts';
import { GATE_KEYS, press } from '../model/keys.ts';
import { livedIn, useSeat } from '../model/seat.ts';
import { BoardView } from './board.tsx';
import { GateModal } from './gate.tsx';
import { JourneyPage } from './journey.tsx';
import { SurfacePage, surfaceMost } from './surface.tsx';

const MUTED = '#5f5f5f';

const FAINT = '#464646';

const NARROW = 80;

export interface WatchPageProps {
  feed: BoardFeed;
  onQuit: () => void;
  clock?: () => string;
}

const HINTS: Record<Exclude<Frame['kind'], 'board'>, string> = {
  journey: '←↑↓→ move · ⏎ open · esc board · q quit',
  surface: '↑↓ scroll · tab ←→ audience · esc back · q quit',
  gate: '⏎ pass · esc cancel',
};

function gateHints(offers: GateActionView[]): string {
  return Object.entries(GATE_KEYS)
    .filter(([, action]) => offers.includes(action))
    .map(([key, action]) => ` · ${key} ${action}`)
    .join('');
}

function hintOf(kind: Frame['kind'], offers: GateActionView[]): string {
  if (kind === 'board') {
    return `←↑↓→ move · ⏎ journey${gateHints(offers)} · r refresh · q quit`;
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

function HeaderRow({ stack, seat }: { stack: FrameStack; seat: Seat }): ReactNode {
  return (
    <box flexDirection="row" justifyContent="space-between">
      <text wrapMode="none">
        <strong>ket</strong>
        <span fg={MUTED}>{`  ${crumbOf(stack.frames)}`}</span>
      </text>
      <text fg={FAINT} wrapMode="none">
        {hintOf(stack.top.kind, seat.chosen?.offers ?? [])}
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
}

function StageArea({ stack, lived, seat, now, tick, width, height }: RoomProps): ReactNode {
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

  return <BoardView lived={lived} now={now} wide={width >= NARROW} seat={seat} />;
}

function CeremonyOverlay({
  stack,
  columns,
  tick,
  width,
  height,
}: Omit<RoomProps, 'lived' | 'seat' | 'now'> & { columns: KanbanColumnView[] }): ReactNode {
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

export function WatchPage({
  feed,
  onQuit,
  clock = () => new Date().toISOString(),
}: WatchPageProps): ReactNode {
  const { columns, now, tick, refresh } = useBoardState(feed, clock);
  const stack = useFrameStack(feed);
  const lived = livedIn(columns);
  const seat = useSeat(lived);
  const { width, height } = useTerminalDimensions();
  const most = stack.top.kind === 'surface' ? surfaceMost(stack.top, height - 3) : 0;

  useCeremonyCurtain(stack, tick);

  useKeyboard((key) => {
    press(key.name, { onQuit, refresh, stack, seat, most, tick });
  });

  return (
    <box flexDirection="column" paddingTop={1} paddingLeft={1} paddingRight={1}>
      <HeaderRow stack={stack} seat={seat} />
      <StageArea
        stack={stack}
        lived={lived}
        seat={seat}
        now={now}
        tick={tick}
        width={width}
        height={height}
      />
      <CeremonyOverlay stack={stack} columns={columns} tick={tick} width={width} height={height} />
    </box>
  );
}
