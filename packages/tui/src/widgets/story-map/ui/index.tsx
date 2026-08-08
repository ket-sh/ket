import type { MouseEvent } from '@opentui/core';
import type { ReactNode } from 'react';

import type { MapBandView, MapCardView, MapReadingView, StoryMapView } from '../../../shared/model';
import type { MapColumn } from '../lib/columns.ts';

import { useTheme } from '../../../shared/theme';
import { cardsUnder, columnsOf } from '../lib/columns.ts';
import { detailOf, seatIndexOf, seatsOf, walkedTo } from '../lib/spot.ts';

const WHAT_A_MAP_IS =
  'A story map lays the journey across the top, the work beneath it, and releases cut across.';

const HOW_TO_START = 'Run /ket:map to sit down and build one.';

const UNREADABLE = 'The map file is there, and the reader turned it away.';

const STEP_OF: Record<string, number> = {
  left: -1,
  up: -1,
  right: 1,
  down: 1,
};

type MapWheelDirection = 'up' | 'down' | 'left' | 'right';

export interface MapPaneProps {
  reading: MapReadingView;
  at: number;
  onSeat?: (at: number) => void;
  onWheel?: (direction: MapWheelDirection) => void;
}

function seatCountOf(reading: MapReadingView): number {
  return 'map' in reading ? seatsOf(reading.map.bands).length : 0;
}

export function walkedIn(reading: MapReadingView, at: number, name: string): number {
  return walkedTo(seatCountOf(reading), at, STEP_OF[name] ?? 0);
}

function Header({ product }: { product: StoryMapView['product'] }): ReactNode {
  const { theme } = useTheme();

  return (
    <box flexDirection="column">
      <text wrapMode="none">
        <strong>{product.name}</strong>
      </text>
      <text wrapMode="none" fg={theme.subtext}>
        {product.idea}
      </text>
    </box>
  );
}

function Spine({ map, columns }: { map: StoryMapView; columns: MapColumn[] }): ReactNode {
  const { theme } = useTheme();

  return (
    <box flexDirection="column" paddingTop={1}>
      <box flexDirection="row">
        {map.spine.map(
          (rib, at): ReactNode => (
            <box
              key={`${rib.activity}-${String(at)}`}
              flexGrow={rib.steps.length}
              flexBasis={1}
              paddingLeft={1}
            >
              <text wrapMode="none" fg={theme.violet}>
                {rib.activity}
              </text>
            </box>
          ),
        )}
      </box>
      <box flexDirection="row">
        {columns.map(
          (column): ReactNode => (
            <box key={column.id} flexGrow={1} flexBasis={1} paddingLeft={1}>
              <text wrapMode="none" fg={theme.subtext}>
                {column.name}
              </text>
            </box>
          ),
        )}
      </box>
    </box>
  );
}

function Card({
  card,
  chosen,
  onPress,
}: {
  card: MapCardView;
  chosen: boolean;
  onPress: () => void;
}): ReactNode {
  const { theme } = useTheme();

  return (
    <box
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
      <text wrapMode="word" fg={theme.text}>
        {card.name}
      </text>
    </box>
  );
}

function titleOf(band: MapBandView): string {
  return band.outcome === undefined ? ` ${band.name} ` : ` ${band.name} · ${band.outcome} `;
}

function Band({
  band,
  columns,
  chosen,
  onSeat,
}: {
  band: MapBandView;
  columns: MapColumn[];
  chosen: string | undefined;
  onSeat: (cardId: string) => void;
}): ReactNode {
  const { theme } = useTheme();

  return (
    <box
      flexDirection="row"
      border
      borderStyle="rounded"
      borderColor={theme.surface1}
      title={titleOf(band)}
      paddingLeft={1}
      paddingRight={1}
    >
      {columns.map(
        (column): ReactNode => (
          <box key={column.id} flexDirection="column" flexGrow={1} flexBasis={1}>
            {cardsUnder(band, column.id).map(
              (card): ReactNode => (
                <Card
                  key={card.id}
                  card={card}
                  chosen={card.id === chosen}
                  onPress={() => {
                    onSeat(card.id);
                  }}
                />
              ),
            )}
          </box>
        ),
      )}
    </box>
  );
}

function EmptyState(): ReactNode {
  const { theme } = useTheme();

  return (
    <box flexDirection="column" paddingTop={1}>
      <text wrapMode="word" fg={theme.text}>
        {WHAT_A_MAP_IS}
      </text>
      <text wrapMode="word" fg={theme.subtext}>
        {HOW_TO_START}
      </text>
    </box>
  );
}

function Refused({ refusals }: { refusals: string[] }): ReactNode {
  const { theme } = useTheme();

  return (
    <box flexDirection="column" paddingTop={1}>
      <text wrapMode="word" fg={theme.text}>
        {UNREADABLE}
      </text>
      {refusals.map(
        (refusal): ReactNode => (
          <text key={refusal} wrapMode="word" fg={theme.red}>
            {`! ${refusal}`}
          </text>
        ),
      )}
    </box>
  );
}

interface MapBodyProps {
  map: StoryMapView;
  at: number;
  onSeat: ((at: number) => void) | undefined;
  onWheel: ((direction: MapWheelDirection) => void) | undefined;
}

function MapBody({ map, at, onSeat, onWheel }: MapBodyProps): ReactNode {
  const { theme } = useTheme();
  const columns = columnsOf(map.spine);
  const seated = seatsOf(map.bands)[at];

  const seatAt = (cardId: string): void => {
    const found = seatIndexOf(map.bands, cardId);

    if (found !== undefined) {
      onSeat?.(found);
    }
  };

  const wheelAt = (event: MouseEvent): void => {
    const direction = event.scroll?.direction;

    if (direction !== undefined) {
      onWheel?.(direction);
    }
  };

  return (
    <box flexDirection="column" onMouseScroll={wheelAt}>
      <Header product={map.product} />
      <Spine map={map} columns={columns} />
      {map.bands.map(
        (band, bandAt): ReactNode => (
          <Band
            key={`${band.name}-${String(bandAt)}`}
            band={band}
            columns={columns}
            chosen={seated?.card.id}
            onSeat={seatAt}
          />
        ),
      )}
      <text wrapMode="none" fg={theme.aqua}>
        {detailOf(seated)}
      </text>
    </box>
  );
}

export function MapPane({ reading, at, onSeat, onWheel }: MapPaneProps): ReactNode {
  if ('refusals' in reading) {
    return <Refused refusals={reading.refusals} />;
  }

  if ('absent' in reading) {
    return <EmptyState />;
  }

  return <MapBody map={reading.map} at={at} onSeat={onSeat} onWheel={onWheel} />;
}
