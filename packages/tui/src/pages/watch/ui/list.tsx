import type { ReactNode } from 'react';

import type { KanbanCardView, KanbanColumnView } from '../../../shared/model';
import type { Seat } from '../model/seat.ts';

import { ageOf } from '../../../shared/lib';
import { STAGE_COLOR, SUBTEXT, TEXT } from '../../../shared/theme';

const MUTED = '#5f5f5f';

const REFUSED = '#d75f5f';

const KEY_ROOM = 7;

const STAGE_ROOM = 19;

const AGE_ROOM = 5;

function agedOf(card: KanbanCardView, now: string): string {
  return card.since === undefined ? '' : ageOf(card.since, now);
}

function Row({
  card,
  now,
  chosen,
}: {
  card: KanbanCardView;
  now: string;
  chosen: boolean;
}): ReactNode {
  return (
    <text wrapMode="none">
      <span fg={TEXT}>{chosen ? '► ' : '  '}</span>
      <strong>{card.key.padEnd(KEY_ROOM)}</strong>
      <span fg={STAGE_COLOR[card.status] ?? SUBTEXT}>{card.status.padEnd(STAGE_ROOM)}</span>
      <span fg={MUTED}>{agedOf(card, now).padEnd(AGE_ROOM)}</span>
      <span fg={chosen ? TEXT : SUBTEXT}>{card.title}</span>
      {card.refusal === undefined ? null : (
        <span fg={REFUSED}>{`   ! ${card.refusal.reason}`}</span>
      )}
    </text>
  );
}

export function ListView({
  lived,
  now,
  seat,
}: {
  lived: KanbanColumnView[];
  now: string;
  seat: Seat;
}): ReactNode {
  const cards = lived.flatMap((column) => column.cards);

  return (
    <box flexDirection="column" paddingTop={1}>
      {cards.map(
        (card): ReactNode => (
          <Row key={card.key} card={card} now={now} chosen={card.key === seat.chosen?.key} />
        ),
      )}
    </box>
  );
}
