import type { ReactNode } from 'react';

import type { KanbanCardView, KanbanColumnView } from '../../../shared/model';

import { stageColorOf, useTheme } from '../../../shared/theme';
import { agedOf } from '../lib/aged.ts';

const KEY_ROOM = 7;

const STAGE_ROOM = 19;

const AGE_ROOM = 5;

function Row({
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
    <text wrapMode="none">
      <span fg={theme.text}>{chosen ? '► ' : '  '}</span>
      <strong>{card.key.padEnd(KEY_ROOM)}</strong>
      <span fg={stageColorOf(theme)[card.status] ?? theme.subtext}>
        {card.status.padEnd(STAGE_ROOM)}
      </span>
      <span fg={theme.gray}>{agedOf(card, now).padEnd(AGE_ROOM)}</span>
      <span fg={chosen ? theme.text : theme.subtext}>{card.title}</span>
      {card.refusal === undefined ? null : (
        <span fg={theme.red}>{`   ! ${card.refusal.reason}`}</span>
      )}
    </text>
  );
}

export function ListView({
  lived,
  now,
  chosenKey,
}: {
  lived: KanbanColumnView[];
  now: string;
  chosenKey: string | undefined;
}): ReactNode {
  const cards = lived.flatMap((column) => column.cards);

  return (
    <box flexDirection="column" paddingTop={1}>
      {cards.map(
        (card): ReactNode => (
          <Row key={card.key} card={card} now={now} chosen={card.key === chosenKey} />
        ),
      )}
    </box>
  );
}
