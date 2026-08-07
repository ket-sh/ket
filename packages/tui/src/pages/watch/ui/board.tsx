import type { ReactNode } from 'react';

import type { KanbanCardView, KanbanColumnView } from '../../../shared/model';
import type { Seat } from '../model/seat.ts';

import { ageOf } from '../../../shared/lib';
import { STAGE_COLOR } from '../../../shared/theme';

const MUTED = '#5f5f5f';

const FAINT = '#464646';

const REFUSED = '#d75f5f';

interface CardFrame {
  style: 'rounded' | 'double';
  color: string;
}

const RESTING: CardFrame = { style: 'rounded', color: FAINT };

function chosenFrame(card: KanbanCardView): CardFrame {
  return { style: 'double', color: STAGE_COLOR[card.status] ?? FAINT };
}

function Card({
  card,
  now,
  frame,
}: {
  card: KanbanCardView;
  now: string;
  frame: CardFrame;
}): ReactNode {
  const age = card.since === undefined ? '' : ageOf(card.since, now);

  return (
    <box
      flexDirection="column"
      border
      borderStyle={frame.style}
      borderColor={frame.color}
      paddingLeft={1}
      paddingRight={1}
    >
      <text wrapMode="none">
        <strong>{card.key}</strong>
        <span fg={MUTED}>{age === '' ? '' : `  ${age}`}</span>
      </text>
      <text wrapMode="none">{card.title}</text>
      {card.refusal === undefined ? null : (
        <text fg={REFUSED} wrapMode="word">{`! ${card.refusal.reason}`}</text>
      )}
    </box>
  );
}

function Column({
  column,
  now,
  wide,
  selectedRow,
}: {
  column: KanbanColumnView;
  now: string;
  wide: boolean;
  selectedRow: number | undefined;
}): ReactNode {
  return (
    <box
      flexDirection="column"
      flexGrow={wide ? 1 : 0}
      flexBasis={wide ? 1 : 'auto'}
      border
      borderStyle="rounded"
      borderColor={FAINT}
      title={` ${column.status} ${String(column.cards.length)} `}
      paddingLeft={1}
      paddingRight={1}
    >
      {column.cards.map(
        (card, cardAt): ReactNode => (
          <Card
            key={card.key}
            card={card}
            now={now}
            frame={cardAt === selectedRow ? chosenFrame(card) : RESTING}
          />
        ),
      )}
    </box>
  );
}

export function BoardView({
  lived,
  now,
  wide,
  seat,
}: {
  lived: KanbanColumnView[];
  now: string;
  wide: boolean;
  seat: Seat;
}): ReactNode {
  return (
    <box flexDirection={wide ? 'row' : 'column'}>
      {lived.map(
        (column, columnAt): ReactNode => (
          <Column
            key={column.status}
            column={column}
            now={now}
            wide={wide}
            selectedRow={columnAt === seat.col ? seat.row : undefined}
          />
        ),
      )}
    </box>
  );
}
