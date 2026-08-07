import type { ReactNode } from 'react';

import { useKeyboard, useTerminalDimensions } from '@opentui/react';
import { useCallback, useEffect, useState } from 'react';

import type { BoardFeed, KanbanCardView, KanbanColumnView } from '../../../shared/model';

import { AGE_TICK, ageOf } from '../../../shared/lib';

const MUTED = '#5f5f5f';

const FAINT = '#464646';

const REFUSED = '#d75f5f';

const NARROW = 80;

export interface KanbanPageProps {
  feed: BoardFeed;
  onQuit: () => void;
  clock?: () => string;
}

function Card({ card, now }: { card: KanbanCardView; now: string }): ReactNode {
  const age = card.since === undefined ? '' : ageOf(card.since, now);

  return (
    <box flexDirection="column" paddingBottom={1}>
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
}: {
  column: KanbanColumnView;
  now: string;
  wide: boolean;
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
        (card): ReactNode => (
          <Card key={card.key} card={card} now={now} />
        ),
      )}
    </box>
  );
}

function livedIn(columns: KanbanColumnView[]): KanbanColumnView[] {
  return columns.filter((column) => column.cards.length > 0 || column.status === 'triaged');
}

export function KanbanPage({
  feed,
  onQuit,
  clock = () => new Date().toISOString(),
}: KanbanPageProps): ReactNode {
  const [columns, setColumns] = useState<KanbanColumnView[]>([]);
  const [now, setNow] = useState(clock());
  const { width } = useTerminalDimensions();

  const refresh = useCallback(() => {
    void feed.snapshot().then(setColumns);
  }, [feed]);

  useEffect(() => {
    refresh();

    return feed.subscribe(refresh);
  }, [feed, refresh]);

  useEffect(() => {
    const ticking = setInterval(() => {
      setNow(clock());
    }, AGE_TICK);

    return () => {
      clearInterval(ticking);
    };
  }, [clock]);

  useKeyboard((key) => {
    if (key.name === 'r') {
      refresh();
    }

    if (key.name === 'q') {
      onQuit();
    }
  });

  return (
    <box flexDirection="column" paddingTop={1} paddingLeft={1} paddingRight={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text>
          <strong>ket</strong>
          <span fg={MUTED}>{'  the board over .ket/events.jsonl'}</span>
        </text>
        <text fg={FAINT}>r refresh · q quit</text>
      </box>
      <box flexDirection={width < NARROW ? 'column' : 'row'}>
        {livedIn(columns).map(
          (column): ReactNode => (
            <Column key={column.status} column={column} now={now} wide={width >= NARROW} />
          ),
        )}
      </box>
    </box>
  );
}
