import type { BoxRenderable, MouseEvent, ScrollBoxRenderable } from '@opentui/core';
import type { ReactNode, RefObject } from 'react';

import { useEffect, useRef } from 'react';

import type { KanbanCardView, KanbanColumnView } from '../../../shared/model';
import type { Theme } from '../../../shared/theme';
import type { WatchMouse } from '../model/mouse.ts';
import type { Seat } from '../model/seat.ts';

import { stageColorOf, useTheme } from '../../../shared/theme';
import { agedOf } from '../lib/aged.ts';
import { accentOf, BELL, needsYou } from '../lib/attention.ts';
import { laneLeast, lanesOverflowAcross, laneTitle } from '../lib/lanes.ts';

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

function laneIdOf(status: string): string {
  return `lane ${status}`;
}

interface ColumnProps {
  column: KanbanColumnView;
  now: string;
  least: number;
  total: number;
  selectedRow: number | undefined;
  mouse: WatchMouse;
}

function LaneCards({
  column,
  now,
  selectedRow,
  mouse,
}: Omit<ColumnProps, 'least' | 'total'>): ReactNode {
  const { theme } = useTheme();

  return column.cards.map(
    (card, cardAt): ReactNode => (
      <Card
        key={card.key}
        card={card}
        now={now}
        frame={cardAt === selectedRow ? chosenFrame(card, theme) : restingFrame(card, theme)}
        mouse={mouse}
      />
    ),
  );
}

function Column({ column, now, least, total, selectedRow, mouse }: ColumnProps): ReactNode {
  const { theme } = useTheme();
  const laneRef = useRef<BoxRenderable>(null);

  return (
    <box
      ref={laneRef}
      id={laneIdOf(column.status)}
      flexDirection="column"
      minWidth={least}
      flexGrow={1}
      flexBasis={1}
      flexShrink={0}
      border
      borderStyle="rounded"
      borderColor={theme.surface1}
      title={laneTitle(column, total)}
      paddingLeft={1}
      paddingRight={1}
      onMouseDown={(event: MouseEvent) => {
        if (event.y === laneRef.current?.y) {
          event.stopPropagation();
          mouse.laneHead(column.cards[0]?.key);
        }
      }}
    >
      <LaneCards column={column} now={now} selectedRow={selectedRow} mouse={mouse} />
    </box>
  );
}

function unmeasured(board: ScrollBoxRenderable): boolean {
  return board.viewport.width === 0;
}

function useLaneFollow(
  boardRef: RefObject<ScrollBoxRenderable | null>,
  chosenStatus: string | undefined,
  tick: number,
): void {
  const seated = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (chosenStatus === undefined || seated.current === chosenStatus) {
      return;
    }

    const board = boardRef.current;

    if (board === null || unmeasured(board)) {
      return;
    }

    seated.current = chosenStatus;
    board.scrollChildIntoView(laneIdOf(chosenStatus));
  }, [boardRef, chosenStatus, tick]);
}

interface BoardViewProps {
  columns: KanbanColumnView[];
  now: string;
  room: number;
  tick: number;
  seat: Seat;
  totals: Map<string, number>;
  mouse: WatchMouse;
}

function Lanes({
  columns,
  now,
  seat,
  totals,
  mouse,
}: Omit<BoardViewProps, 'room' | 'tick'>): ReactNode {
  const least = laneLeast(columns, totals);

  return columns.map(
    (column, columnAt): ReactNode => (
      <Column
        key={column.status}
        column={column}
        now={now}
        least={least}
        total={totals.get(column.status) ?? column.cards.length}
        selectedRow={columnAt === seat.col ? seat.row : undefined}
        mouse={mouse}
      />
    ),
  );
}

export function BoardView({
  columns,
  now,
  room,
  tick,
  seat,
  totals,
  mouse,
}: BoardViewProps): ReactNode {
  const { theme } = useTheme();
  const boardRef = useRef<ScrollBoxRenderable>(null);

  useLaneFollow(boardRef, columns[seat.col]?.status, tick);

  const wheelAt = (event: MouseEvent): void => {
    const direction = event.scroll?.direction;

    if (
      (direction === 'up' || direction === 'down') &&
      lanesOverflowAcross(columns, room, totals)
    ) {
      mouse.boardWheel(direction);
    }
  };

  return (
    <scrollbox
      ref={boardRef}
      scrollX
      scrollY={false}
      focusable={false}
      flexGrow={1}
      flexBasis={0}
      contentOptions={{ flexDirection: 'row' }}
      horizontalScrollbarOptions={{
        trackOptions: { foregroundColor: theme.surface1, backgroundColor: theme.base },
      }}
      onMouseScroll={wheelAt}
    >
      <Lanes columns={columns} now={now} seat={seat} totals={totals} mouse={mouse} />
    </scrollbox>
  );
}
