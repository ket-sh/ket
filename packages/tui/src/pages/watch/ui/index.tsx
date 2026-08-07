import type { ReactNode } from 'react';

import { useKeyboard, useTerminalDimensions } from '@opentui/react';

import type { BoardFeed } from '../../../shared/model';

import { useBoardState } from '../model/board-state.ts';
import { crumbOf, useFrameStack } from '../model/frames.ts';
import { press } from '../model/keys.ts';
import { livedIn, useSeat } from '../model/seat.ts';
import { BoardView } from './board.tsx';
import { JourneyPage } from './journey.tsx';

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
  journey: '←↑↓→ move · esc board · q quit',
};

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

  useKeyboard((key) => {
    press(key.name, { onQuit, refresh, stack, seat });
  });

  return (
    <box flexDirection="column" paddingTop={1} paddingLeft={1} paddingRight={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text wrapMode="none">
          <strong>ket</strong>
          <span fg={MUTED}>{`  ${crumbOf(stack.frames)}`}</span>
        </text>
        <text fg={FAINT} wrapMode="none">
          {stack.top.kind === 'journey' ? HINTS.journey : HINTS.board}
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
      ) : (
        <BoardView lived={lived} now={now} wide={width >= NARROW} seat={seat} />
      )}
    </box>
  );
}
