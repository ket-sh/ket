import type { MouseEvent } from '@opentui/core';
import type { ReactNode } from 'react';

import type { MapBandView, MapReadingView, StoryMapView } from '../../../shared/model';
import type { MapColumn } from '../lib/columns.ts';
import type { MapFrame } from '../lib/frame.ts';

import { useTheme } from '../../../shared/theme';
import { columnsOf } from '../lib/columns.ts';
import { columnWidthsOf, shownBandsOf } from '../lib/frame.ts';
import { detailOf, seatIndexOf, seatsOf, walkedTo } from '../lib/spot.ts';
import { Band } from './band.tsx';

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
  frame?: MapFrame;
  onSeat?: (at: number) => void;
  onWheel?: (direction: MapWheelDirection) => void;
}

const HEADER_ROWS = 2;

const SPINE_ROWS = 3;

const DETAIL_ROWS = 1;

const ROWS_AROUND_BANDS = HEADER_ROWS + SPINE_ROWS + DETAIL_ROWS;

function seatCountOf(reading: MapReadingView): number {
  return 'map' in reading ? seatsOf(reading.map.bands).length : 0;
}

export function walkedIn(reading: MapReadingView, at: number, name: string): number {
  return walkedTo(seatCountOf(reading), at, STEP_OF[name] ?? 0);
}

function Header({ product }: { product: StoryMapView['product'] }): ReactNode {
  const { theme } = useTheme();

  return (
    <box flexDirection="column" flexShrink={0}>
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
    <box flexDirection="column" flexShrink={0} paddingTop={1}>
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
  frame: MapFrame | undefined;
  onSeat: ((at: number) => void) | undefined;
  onWheel: ((direction: MapWheelDirection) => void) | undefined;
}

interface BandSeating {
  widths: number[] | undefined;
  bands: MapBandView[];
}

function bandSeatingOf(map: StoryMapView, columns: MapColumn[], frame?: MapFrame): BandSeating {
  if (frame === undefined) {
    return { widths: undefined, bands: map.bands };
  }

  const widths = columnWidthsOf(frame.cols, columns.length);
  const room = frame.rows - ROWS_AROUND_BANDS;

  return { widths, bands: map.bands.slice(0, shownBandsOf(map.bands, columns, widths, room)) };
}

function MapBody({ map, at, frame, onSeat, onWheel }: MapBodyProps): ReactNode {
  const { theme } = useTheme();
  const columns = columnsOf(map.spine);
  const { widths, bands } = bandSeatingOf(map, columns, frame);
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
      <box flexDirection="column" overflow="hidden" minHeight={0}>
        {bands.map(
          (band, bandAt): ReactNode => (
            <Band
              key={`${band.name}-${String(bandAt)}`}
              band={band}
              columns={columns}
              widths={widths}
              chosen={seated?.card.id}
              onSeat={seatAt}
            />
          ),
        )}
      </box>
      <text wrapMode="none" flexShrink={0} fg={theme.aqua}>
        {detailOf(seated)}
      </text>
    </box>
  );
}

export function MapPane({ reading, at, frame, onSeat, onWheel }: MapPaneProps): ReactNode {
  if ('refusals' in reading) {
    return <Refused refusals={reading.refusals} />;
  }

  if ('absent' in reading) {
    return <EmptyState />;
  }

  return <MapBody map={reading.map} at={at} frame={frame} onSeat={onSeat} onWheel={onWheel} />;
}
