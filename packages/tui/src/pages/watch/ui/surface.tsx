import type { ReactNode } from 'react';

import type { Frame } from '../model/frames.ts';

import { lerpHex } from '../../../shared/lib';
import { BASE, BLUE } from '../../../shared/theme';
import { SpanRow } from '../../../shared/ui';
import { docLines } from '../lib/lines.ts';

type SurfaceFrame = Extract<Frame, { kind: 'surface' }>;

function surfaceRoom(height: number): number {
  return Math.max(4, height - 5);
}

export function surfaceMost(frame: SurfaceFrame, height: number): number {
  return Math.max(0, docLines(frame.doc, frame.aud).length - surfaceRoom(height));
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), Math.max(low, high));
}

export function SurfacePage({ frame, height }: { frame: SurfaceFrame; height: number }): ReactNode {
  const lines = docLines(frame.doc, frame.aud);
  const room = surfaceRoom(height);
  const off = clamp(frame.off, 0, Math.max(0, lines.length - room));
  const shown = lines.slice(off, off + room);
  const range =
    lines.length > room
      ? ` · ${String(off + 1)}-${String(off + shown.length)}/${String(lines.length)}`
      : '';

  return (
    <box
      border
      borderStyle="rounded"
      borderColor={lerpHex(BLUE, BASE, 0.35)}
      title={` ${frame.title}${range} `}
      flexDirection="column"
      flexGrow={1}
      overflow="hidden"
      paddingLeft={1}
      paddingRight={1}
    >
      {shown.map(
        (spans, index): ReactNode => (
          <SpanRow key={String(index)} spans={spans} />
        ),
      )}
    </box>
  );
}
