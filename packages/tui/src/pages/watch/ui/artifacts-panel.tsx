import type { BoxRenderable, MouseEvent } from '@opentui/core';
import type { ReactNode } from 'react';

import { useRef } from 'react';

import type { Ln } from '../../../shared/lib';
import type { JourneyArtifactView, JourneyView, SurfaceDocView } from '../../../shared/model';
import type { Theme } from '../../../shared/theme';
import type { Audience } from '../lib/lines.ts';
import type { JourneyFocus } from '../model/frames.ts';
import type { WatchMouse } from '../model/mouse.ts';

import { useTheme } from '../../../shared/theme';
import { SpanRow } from '../../../shared/ui';
import { audienceAt, docLines } from '../lib/lines.ts';
import { readShiftOf } from '../lib/reading.ts';

export interface PanelProps {
  journey: JourneyView;
  pick: number;
  focus: JourneyFocus;
  cur: number;
  aud: Audience;
  height: number;
  mouse: WatchMouse;
}

const SIDEBAR = 26;

const NOTHING_WRITTEN = 'No artifacts written yet.';

function ArtifactName({
  artifact,
  chosen,
  onPress,
}: {
  artifact: JourneyArtifactView;
  chosen: boolean;
  onPress: () => void;
}): ReactNode {
  const { theme } = useTheme();

  return (
    <text
      fg={chosen ? theme.text : theme.subtext}
      wrapMode="none"
      onMouseDown={(event: MouseEvent) => {
        event.stopPropagation();
        onPress();
      }}
    >
      {`${chosen ? '►' : ' '} ${artifact.name}`}
    </text>
  );
}

function readRow(spans: Ln, marked: boolean, theme: Theme): Ln {
  if (!marked) {
    return [{ text: ' ' }, ...spans];
  }

  return [
    { text: '▎', fg: theme.blue },
    ...spans.map((span) => ({ ...span, bg: span.bg ?? theme.surface0 })),
  ];
}

interface Reading extends Pick<PanelProps, 'aud' | 'cur' | 'focus' | 'height' | 'mouse'> {
  doc: SurfaceDocView;
}

function gutterSpotOf(rows: BoxRenderable | null, event: MouseEvent): { x: number; y: number } {
  return { x: event.x - (rows?.x ?? 0) - 1, y: event.y - (rows?.y ?? 0) };
}

function ReadRows({ doc, aud, cur, focus, height, mouse }: Reading): ReactNode {
  const { theme } = useTheme();
  const rowsRef = useRef<BoxRenderable>(null);
  const lines = docLines(doc, aud, theme);
  const room = Math.max(4, height);
  const from = readShiftOf(cur, lines.length, room);

  const pillAt = (event: MouseEvent): void => {
    const spot = gutterSpotOf(rowsRef.current, event);
    const side = from === 0 && spot.y === 0 ? audienceAt(doc, spot.x) : undefined;

    if (side !== undefined) {
      event.stopPropagation();
      mouse.audienceSide(side);
    }
  };

  return (
    <box ref={rowsRef} flexDirection="column" onMouseDown={pillAt}>
      {lines.slice(from, from + room).map(
        (spans, index): ReactNode => (
          <SpanRow
            key={String(index)}
            spans={readRow(spans, focus === 'content' && from + index === cur, theme)}
          />
        ),
      )}
    </box>
  );
}

function ChosenContent({
  artifact,
  reading,
}: {
  artifact: JourneyArtifactView | undefined;
  reading: Omit<Reading, 'doc'>;
}): ReactNode {
  const { theme } = useTheme();

  if (artifact?.doc === undefined) {
    return <text fg={theme.overlay}>{NOTHING_WRITTEN}</text>;
  }

  return <ReadRows doc={artifact.doc} {...reading} />;
}

export function ArtifactsPanel({
  journey,
  pick,
  focus,
  cur,
  aud,
  height,
  mouse,
}: PanelProps): ReactNode {
  const { theme } = useTheme();

  if (journey.artifacts.length === 0) {
    return <text fg={theme.overlay}>{NOTHING_WRITTEN}</text>;
  }

  return (
    <box flexDirection="row">
      <box flexDirection="column" width={SIDEBAR}>
        {journey.artifacts.map(
          (artifact, index): ReactNode => (
            <ArtifactName
              key={artifact.path}
              artifact={artifact}
              chosen={index === pick}
              onPress={() => {
                mouse.artifactRow(index);
              }}
            />
          ),
        )}
      </box>
      <box
        flexDirection="column"
        borderStyle="rounded"
        borderColor={focus === 'content' ? theme.blue : theme.overlay}
        border={['left']}
      >
        <ChosenContent
          artifact={journey.artifacts[pick]}
          reading={{ aud, cur, focus, height, mouse }}
        />
      </box>
    </box>
  );
}
