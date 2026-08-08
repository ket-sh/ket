import type { ReactNode } from 'react';

import type { OplogEventView } from '../../../shared/model';
import type { Theme } from '../../../shared/theme';
import type { WatchMouse } from '../model/mouse.ts';

import { ageOf } from '../../../shared/lib';
import { useTheme } from '../../../shared/theme';
import { gateOf, seatedRow, textOf } from '../lib/oplog.ts';
import { groundedOn, pressedRow, wheeledThrough } from './pane-mouse.ts';

const AGE_ROOM = 5;

const GATE_ROOM = 11;

const OUTCOME_ROOM = 8;

const KEY_ROOM = 7;

const FRAME_ROWS = 2;

function agedAt(event: OplogEventView, now: string): string {
  return event.at === undefined ? '' : ageOf(event.at, now);
}

interface OutcomeWorn {
  word: string;
  color: string;
}

function outcomeWorn(event: OplogEventView, theme: Theme): OutcomeWorn {
  const word = event.outcome ?? '';

  return { word, color: word === 'refused' ? theme.red : theme.gray };
}

function OplogRow({
  event,
  now,
  chosen,
  onPress,
}: {
  event: OplogEventView;
  now: string;
  chosen: boolean;
  onPress: () => void;
}): ReactNode {
  const { theme } = useTheme();
  const outcome = outcomeWorn(event, theme);

  return (
    <text wrapMode="none" onMouseDown={pressedRow(onPress)}>
      <span fg={theme.text}>{chosen ? '► ' : '  '}</span>
      <span fg={theme.gray}>{agedAt(event, now).padEnd(AGE_ROOM)}</span>
      <span fg={theme.subtext}>
        {gateOf(event)
          .slice(0, GATE_ROOM - 1)
          .padEnd(GATE_ROOM)}
      </span>
      <span fg={outcome.color}>{outcome.word.padEnd(OUTCOME_ROOM)}</span>
      <strong>{(event.item ?? '').padEnd(KEY_ROOM)}</strong>
      <span fg={chosen ? theme.text : theme.subtext}>{textOf(event)}</span>
    </text>
  );
}

export function OplogView({
  shown,
  sel,
  now,
  height,
  mouse,
}: {
  shown: OplogEventView[];
  sel: number;
  now: string;
  height: number;
  mouse: WatchMouse;
}): ReactNode {
  const { theme } = useTheme();
  const room = Math.max(1, height - FRAME_ROWS);
  const chosen = seatedRow(sel, shown.length);
  const from = Math.max(0, chosen - room + 1);

  return (
    <box
      flexDirection="column"
      border
      borderStyle="rounded"
      borderColor={theme.surface1}
      title=" oplog · last 500 "
      paddingLeft={1}
      paddingRight={1}
      onMouseDown={groundedOn(mouse)}
      onMouseScroll={wheeledThrough(mouse.logWheel)}
    >
      {shown.slice(from, from + room).map(
        (event, seatAt): ReactNode => (
          <OplogRow
            key={String(from + seatAt)}
            event={event}
            now={now}
            chosen={from + seatAt === chosen}
            onPress={() => {
              mouse.logRow(from + seatAt);
            }}
          />
        ),
      )}
    </box>
  );
}
