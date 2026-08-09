import type { MouseEvent } from '@opentui/core';
import type { ReactNode } from 'react';

import type { MapBandView, MapCardView } from '../../../shared/model';
import type { MapColumn } from '../lib/columns.ts';

import { useTheme } from '../../../shared/theme';
import { cardsUnder } from '../lib/columns.ts';
import { cardLinesOf } from '../lib/frame.ts';

function Card({
  card,
  lines,
  chosen,
  onPress,
}: {
  card: MapCardView;
  lines: string[] | undefined;
  chosen: boolean;
  onPress: () => void;
}): ReactNode {
  const { theme } = useTheme();

  return (
    <box
      flexShrink={0}
      border
      borderStyle={chosen ? 'double' : 'rounded'}
      borderColor={chosen ? theme.blue : theme.surface1}
      paddingLeft={1}
      paddingRight={1}
      onMouseDown={(event: MouseEvent) => {
        event.stopPropagation();
        onPress();
      }}
    >
      {lines === undefined ? (
        <text wrapMode="word" fg={theme.text}>
          {card.name}
        </text>
      ) : (
        lines.map(
          (line, atLine): ReactNode => (
            <text key={`${String(atLine)}-${line}`} wrapMode="none" fg={theme.text}>
              {line}
            </text>
          ),
        )
      )}
    </box>
  );
}

function titleOf(band: MapBandView): string {
  return band.outcome === undefined ? ` ${band.name} ` : ` ${band.name} · ${band.outcome} `;
}

function BandColumn({
  band,
  column,
  width,
  chosen,
  onSeat,
}: {
  band: MapBandView;
  column: MapColumn;
  width: number | undefined;
  chosen: string | undefined;
  onSeat: (cardId: string) => void;
}): ReactNode {
  return (
    <box
      flexDirection="column"
      flexGrow={width === undefined ? 1 : 0}
      flexBasis={width === undefined ? 1 : 'auto'}
      width={width ?? 'auto'}
    >
      {cardsUnder(band, column.id).map(
        (card): ReactNode => (
          <Card
            key={card.id}
            card={card}
            lines={width === undefined ? undefined : cardLinesOf(card.name, width)}
            chosen={card.id === chosen}
            onPress={() => {
              onSeat(card.id);
            }}
          />
        ),
      )}
    </box>
  );
}

export function Band({
  band,
  columns,
  widths,
  chosen,
  onSeat,
}: {
  band: MapBandView;
  columns: MapColumn[];
  widths: number[] | undefined;
  chosen: string | undefined;
  onSeat: (cardId: string) => void;
}): ReactNode {
  const { theme } = useTheme();

  return (
    <box
      flexDirection="row"
      flexShrink={0}
      border
      borderStyle="rounded"
      borderColor={theme.surface1}
      title={titleOf(band)}
      paddingLeft={1}
      paddingRight={1}
      paddingBottom={1}
    >
      {columns.map(
        (column, at): ReactNode => (
          <BandColumn
            key={column.id}
            band={band}
            column={column}
            width={widths?.[at]}
            chosen={chosen}
            onSeat={onSeat}
          />
        ),
      )}
    </box>
  );
}
