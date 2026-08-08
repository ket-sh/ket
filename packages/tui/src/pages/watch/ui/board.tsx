import type { BoxRenderable, MouseEvent } from '@opentui/core';
import type { ReactNode } from 'react';

import { useRef } from 'react';

import type { KanbanCardView, KanbanColumnView } from '../../../shared/model';
import type { Theme } from '../../../shared/theme';
import type { WatchMouse } from '../model/mouse.ts';
import type { Seat } from '../model/seat.ts';

import { stageColorOf, useTheme } from '../../../shared/theme';
import { agedOf } from '../lib/aged.ts';
import { accentOf, BELL, needsYou } from '../lib/attention.ts';
import { laneTitle } from '../lib/lanes.ts';

interface CardFrame {
  style: 'rounded' | 'double';
  color: string;
}

function restingFrame(card: KanbanCardView, theme: Theme): CardFrame {
  return { style: 'rounded', color: accentOf(card, theme) ?? theme.surface1 };
}

function chosenFrame(card: KanbanCardView, theme: Theme): CardFrame {
  return {
    style: 'double',
    color: accentOf(card, theme) ?? stageColorOf(theme)[card.status] ?? theme.surface1,
  };
}

function CardHead({ card, age }: { card: KanbanCardView; age: string }): ReactNode {
  const { theme } = useTheme();

  return (
    <box flexDirection="row" justifyContent="space-between">
      <text wrapMode="none">
        <strong>{card.key}</strong>
        <span fg={theme.gray}>{age === '' ? '' : `  ${age}`}</span>
      </text>
      {needsYou(card) ? (
        <text wrapMode="none" fg={theme.yellow}>
          {BELL}
        </text>
      ) : null}
    </box>
  );
}

function Card({
  card,
  now,
  frame,
  mouse,
}: {
  card: KanbanCardView;
  now: string;
  frame: CardFrame;
  mouse: WatchMouse;
}): ReactNode {
  const { theme } = useTheme();

  return (
    <box
      flexDirection="column"
      border
      borderStyle={frame.style}
      borderColor={frame.color}
      paddingLeft={1}
      paddingRight={1}
      onMouseDown={(event: MouseEvent) => {
        event.stopPropagation();
        mouse.boardCard(card.key);
      }}
    >
      <CardHead card={card} age={agedOf(card, now)} />
      <text wrapMode="none" fg={theme.text}>
        {card.title}
      </text>
      {card.note === undefined ? null : (
        <text wrapMode="none" fg={theme.gray}>
          {card.note.text}
        </text>
      )}
      {card.refusal === undefined ? null : (
        <text fg={theme.red} wrapMode="word">{`! ${card.refusal.reason}`}</text>
      )}
    </box>
  );
}

function Column({
  column,
  now,
  inRow,
  selectedRow,
  mouse,
}: {
  column: KanbanColumnView;
  now: string;
  inRow: boolean;
  selectedRow: number | undefined;
  mouse: WatchMouse;
}): ReactNode {
  const { theme } = useTheme();
  const laneRef = useRef<BoxRenderable>(null);

  return (
    <box
      ref={laneRef}
      flexDirection="column"
      flexGrow={inRow ? 1 : 0}
      flexBasis={inRow ? 1 : 'auto'}
      flexShrink={0}
      border
      borderStyle="rounded"
      borderColor={theme.surface1}
      title={laneTitle(column)}
      paddingLeft={1}
      paddingRight={1}
      onMouseDown={(event: MouseEvent) => {
        if (event.y === laneRef.current?.y) {
          event.stopPropagation();
          mouse.laneHead(column.cards[0]?.key);
        }
      }}
    >
      {column.cards.map(
        (card, cardAt): ReactNode => (
          <Card
            key={card.key}
            card={card}
            now={now}
            frame={cardAt === selectedRow ? chosenFrame(card, theme) : restingFrame(card, theme)}
            mouse={mouse}
          />
        ),
      )}
    </box>
  );
}

export function BoardView({
  columns,
  now,
  inRow,
  seat,
  mouse,
}: {
  columns: KanbanColumnView[];
  now: string;
  inRow: boolean;
  seat: Seat;
  mouse: WatchMouse;
}): ReactNode {
  return (
    <box flexDirection={inRow ? 'row' : 'column'}>
      {columns.map(
        (column, columnAt): ReactNode => (
          <Column
            key={column.status}
            column={column}
            now={now}
            inRow={inRow}
            selectedRow={columnAt === seat.col ? seat.row : undefined}
            mouse={mouse}
          />
        ),
      )}
    </box>
  );
}
