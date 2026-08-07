import type { ReactNode } from 'react';

import { useKeyboard, useTerminalDimensions } from '@opentui/react';

import type { BoardFeed } from '../../../shared/model';

import { useBoardState } from '../model/board-state.ts';
import { crumbOf, useFrameStack } from '../model/frames.ts';
import { press } from '../model/keys.ts';
import { livedIn, useSeat } from '../model/seat.ts';
import { BoardView } from './board.tsx';
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

const HINTS = {
  board: '←↑↓→ move · ⏎ journey · r refresh · q quit',
  journey: '←↑↓→ move · ⏎ open · esc board · q quit',
  surface: '↑↓ scroll · tab ←→ audience · esc back · q quit',
};

function hintOf(kind: 'board' | 'journey' | 'surface'): string {
  return HINTS[kind];
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

  useKeyboard((key) => {
    press(key.name, { onQuit, refresh, stack, seat, most });
  });

  return (
    <box flexDirection="column" paddingTop={1} paddingLeft={1} paddingRight={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text wrapMode="none">
          <strong>ket</strong>
          <span fg={MUTED}>{`  ${crumbOf(stack.frames)}`}</span>
        </text>
        <text fg={FAINT} wrapMode="none">
          {hintOf(stack.top.kind)}
        </text>
      </box>
      {stack.top.kind === 'journey' ? (
        <JourneyPage
          journey={stack.top.journey}
          sel={stack.top.sel}
          now={now}
          tick={tick}
          width={width - 2}
          height={height - 3}
        />
      ) : stack.top.kind === 'surface' ? (
        <SurfacePage frame={stack.top} height={height - 3} />
      ) : (
        <BoardView lived={lived} now={now} wide={width >= NARROW} seat={seat} />
      )}
    </box>
  );
}
