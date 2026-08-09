import type { MouseEvent } from '@opentui/core';
import type { ReactNode } from 'react';

import type { KanbanCardView } from '../../../shared/model';
import type { Theme } from '../../../shared/theme';

import { stageColorOf, useTheme } from '../../../shared/theme';
import { agedOf } from '../lib/aged.ts';

const KEY_ROOM = 7;

const LIST_STAGE_ROOM = 19;

const AGE_ROOM = 5;

const BACKLOG_STAGE_ROOM = 10;

const SIZE_ROOM = 9;

export type FlatRowKind = 'list' | 'backlog' | 'archive';

interface FlatFacts {
  card: KanbanCardView;
  now: string;
  theme: Theme;
}

function agedSpan({ card, now, theme }: FlatFacts): ReactNode {
  return <span fg={theme.gray}>{agedOf(card, now).padEnd(AGE_ROOM)}</span>;
}

function sizeSpan({ card, theme }: FlatFacts): ReactNode {
  return <span fg={theme.gray}>{card.size.padEnd(SIZE_ROOM)}</span>;
}

function refusalSpan({ card, theme }: FlatFacts): ReactNode {
  return card.refusal === undefined ? undefined : (
    <span fg={theme.red}>{`   ! ${card.refusal.reason}`}</span>
  );
}

function parentSpan({ card, theme }: FlatFacts): ReactNode {
  return card.parent === undefined ? undefined : (
    <span fg={theme.gray}>{`   under ${card.parent}`}</span>
  );
}

interface FlatShape {
  stageRoom: number;
  middle: (facts: FlatFacts) => ReactNode;
  tail: (facts: FlatFacts) => ReactNode;
}

const FLAT_SHAPES: Record<FlatRowKind, FlatShape> = {
  list: { stageRoom: LIST_STAGE_ROOM, middle: agedSpan, tail: refusalSpan },
  backlog: { stageRoom: BACKLOG_STAGE_ROOM, middle: sizeSpan, tail: parentSpan },
  archive: {
    stageRoom: BACKLOG_STAGE_ROOM,
    middle: (facts): ReactNode => (
      <>
        {sizeSpan(facts)}
        {agedSpan(facts)}
      </>
    ),
    tail: (): ReactNode => undefined,
  },
};

function FlatRow({
  kind,
  card,
  now,
  chosen,
  onPress,
}: {
  kind: FlatRowKind;
  card: KanbanCardView;
  now: string;
  chosen: boolean;
  onPress: () => void;
}): ReactNode {
  const { theme } = useTheme();
  const shape = FLAT_SHAPES[kind];
  const facts = { card, now, theme };

  return (
    <text
      wrapMode="none"
      onMouseDown={(event: MouseEvent) => {
        event.stopPropagation();
        onPress();
      }}
    >
      <span fg={theme.text}>{chosen ? '► ' : '  '}</span>
      <strong>{card.key.padEnd(KEY_ROOM)}</strong>
      <span fg={stageColorOf(theme)[card.status] ?? theme.subtext}>
        {card.status.padEnd(shape.stageRoom)}
      </span>
      {shape.middle(facts)}
      <span fg={chosen ? theme.text : theme.subtext}>{card.title}</span>
      {shape.tail(facts)}
    </text>
  );
}

export function FlatRows({
  kind,
  cards,
  now,
  chosenKey,
  onRow,
}: {
  kind: FlatRowKind;
  cards: KanbanCardView[];
  now: string;
  chosenKey: string | undefined;
  onRow: (key: string) => void;
}): ReactNode {
  return cards.map(
    (card): ReactNode => (
      <FlatRow
        key={card.key}
        kind={kind}
        card={card}
        now={now}
        chosen={card.key === chosenKey}
        onPress={() => {
          onRow(card.key);
        }}
      />
    ),
  );
}
