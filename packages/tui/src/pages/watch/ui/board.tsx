import type { ReactNode } from 'react';

import type { KanbanCardView, KanbanColumnView } from '../../../shared/model';
import type { Theme } from '../../../shared/theme';
import type { Seat } from '../model/seat.ts';

import { stageColorOf, useTheme } from '../../../shared/theme';
import { agedOf } from '../lib/aged.ts';

interface CardFrame {
  style: 'rounded' | 'double';
  color: string;
}

function restingFrame(theme: Theme): CardFrame {
  return { style: 'rounded', color: theme.surface1 };
}

function chosenFrame(card: KanbanCardView, theme: Theme): CardFrame {
  return { style: 'double', color: stageColorOf(theme)[card.status] ?? theme.surface1 };
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
  const { theme } = useTheme();
  const age = agedOf(card, now);

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
        <span fg={theme.gray}>{age === '' ? '' : `  ${age}`}</span>
      </text>
      <text wrapMode="none" fg={theme.text}>
        {card.title}
      </text>
      {card.refusal === undefined ? null : (
        <text fg={theme.red} wrapMode="word">{`! ${card.refusal.reason}`}</text>
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
  const { theme } = useTheme();

  return (
    <box
      flexDirection="column"
      flexGrow={wide ? 1 : 0}
      flexBasis={wide ? 1 : 'auto'}
      border
      borderStyle="rounded"
      borderColor={theme.surface1}
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
            frame={cardAt === selectedRow ? chosenFrame(card, theme) : restingFrame(theme)}
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
