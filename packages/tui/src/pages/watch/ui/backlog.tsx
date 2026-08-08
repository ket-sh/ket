import type { ReactNode } from 'react';

import type { KanbanCardView, KanbanColumnView } from '../../../shared/model';

import { stageColorOf, useTheme } from '../../../shared/theme';
import { backlogOf } from '../lib/backlog.ts';

const KEY_ROOM = 7;

const STAGE_ROOM = 10;

const SIZE_ROOM = 9;

function Row({ card, chosen }: { card: KanbanCardView; chosen: boolean }): ReactNode {
  const { theme } = useTheme();

  return (
    <text wrapMode="none">
      <span fg={theme.text}>{chosen ? '► ' : '  '}</span>
      <strong>{card.key.padEnd(KEY_ROOM)}</strong>
      <span fg={stageColorOf(theme)[card.status] ?? theme.subtext}>
        {card.status.padEnd(STAGE_ROOM)}
      </span>
      <span fg={theme.gray}>{card.size.padEnd(SIZE_ROOM)}</span>
      <span fg={chosen ? theme.text : theme.subtext}>{card.title}</span>
      {card.parent === undefined ? null : <span fg={theme.gray}>{`   under ${card.parent}`}</span>}
    </text>
  );
}

export function BacklogView({
  columns,
  chosenKey,
}: {
  columns: KanbanColumnView[];
  chosenKey: string | undefined;
}): ReactNode {
  const { theme } = useTheme();
  const cards = backlogOf(columns);

  return (
    <box
      flexDirection="column"
      border
      borderStyle="rounded"
      borderColor={theme.surface1}
      title={` backlog · ${String(cards.length)} waiting `}
      paddingLeft={1}
      paddingRight={1}
    >
      {cards.map(
        (card): ReactNode => (
          <Row key={card.key} card={card} chosen={card.key === chosenKey} />
        ),
      )}
    </box>
  );
}
