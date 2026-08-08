import type { MouseEvent } from '@opentui/core';
import type { ReactNode } from 'react';

import type { KanbanCardView } from '../../../shared/model';

import { stageColorOf, useTheme } from '../../../shared/theme';
import { agedOf } from '../lib/aged.ts';

const KEY_ROOM = 7;

const LIST_STAGE_ROOM = 19;

const AGE_ROOM = 5;

const BACKLOG_STAGE_ROOM = 10;

const SIZE_ROOM = 9;

export function ListRow({
  card,
  now,
  chosen,
}: {
  card: KanbanCardView;
  now: string;
  chosen: boolean;
}): ReactNode {
  const { theme } = useTheme();

  return (
    <CardRow
      card={card}
      chosen={chosen}
      stageRoom={LIST_STAGE_ROOM}
      middle={<span fg={theme.gray}>{agedOf(card, now).padEnd(AGE_ROOM)}</span>}
      tail={
        card.refusal === undefined ? undefined : (
          <span fg={theme.red}>{`   ! ${card.refusal.reason}`}</span>
        )
      }
    />
  );
}

export function BacklogRow({
  card,
  chosen,
  onPress,
}: {
  card: KanbanCardView;
  chosen: boolean;
  onPress: () => void;
}): ReactNode {
  const { theme } = useTheme();

  return (
    <CardRow
      card={card}
      chosen={chosen}
      stageRoom={BACKLOG_STAGE_ROOM}
      middle={<span fg={theme.gray}>{card.size.padEnd(SIZE_ROOM)}</span>}
      tail={
        card.parent === undefined ? undefined : (
          <span fg={theme.gray}>{`   under ${card.parent}`}</span>
        )
      }
      onPress={onPress}
    />
  );
}

function CardRow({
  card,
  chosen,
  stageRoom,
  middle,
  tail,
  onPress,
}: {
  card: KanbanCardView;
  chosen: boolean;
  stageRoom: number;
  middle?: ReactNode;
  tail?: ReactNode;
  onPress?: () => void;
}): ReactNode {
  const { theme } = useTheme();

  return (
    <text
      wrapMode="none"
      onMouseDown={(event: MouseEvent) => {
        if (onPress !== undefined) {
          event.stopPropagation();
          onPress();
        }
      }}
    >
      <span fg={theme.text}>{chosen ? '► ' : '  '}</span>
      <strong>{card.key.padEnd(KEY_ROOM)}</strong>
      <span fg={stageColorOf(theme)[card.status] ?? theme.subtext}>
        {card.status.padEnd(stageRoom)}
      </span>
      {middle}
      <span fg={chosen ? theme.text : theme.subtext}>{card.title}</span>
      {tail}
    </text>
  );
}
