import type { ReactNode } from 'react';

import type { JourneyView } from '../../../shared/model';

import { OVERLAY, RED } from '../../../shared/theme';
import { SpanRow } from '../../../shared/ui';
import { journeyRows } from '../lib/canvas.ts';

export interface JourneyPageProps {
  journey: JourneyView;
  sel: string;
  now: string;
  tick: number;
  width: number;
  height: number;
}

export function JourneyPage({
  journey,
  sel,
  now,
  tick,
  width,
  height,
}: JourneyPageProps): ReactNode {
  const room = journey.standing === undefined ? 2 : 3;
  const rows = journeyRows(journey, sel, now, tick, {
    width: Math.max(20, width - 2),
    height: Math.max(6, height - room),
  });

  return (
    <box flexDirection="column">
      <box
        border
        borderStyle="rounded"
        borderColor={OVERLAY}
        title={` ${journey.item} · journey `}
        flexDirection="column"
      >
        {rows.map(
          (spans, index): ReactNode => (
            <SpanRow key={String(index)} spans={spans} />
          ),
        )}
      </box>
      {journey.standing === undefined ? null : (
        <text fg={RED} wrapMode="none">{`! ${journey.standing}`}</text>
      )}
    </box>
  );
}
