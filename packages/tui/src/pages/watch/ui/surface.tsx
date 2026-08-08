import type { ReactNode } from 'react';

import type { Frame } from '../model/frames.ts';

import { lerpHex } from '../../../shared/lib';
import { useTheme } from '../../../shared/theme';
import { docLines } from '../lib/lines.ts';
import { DocRows } from './doc-rows.tsx';

type SurfaceFrame = Extract<Frame, { kind: 'surface' }>;

export function pageRoom(height: number, least: number): number {
  return Math.max(least, height - 5);
}

export function pageTone(color: string, ground: { base: string }): string {
  return lerpHex(color, ground.base, 0.35);
}

function surfaceRoom(height: number): number {
  return pageRoom(height, 4);
}

export function surfaceMost(frame: SurfaceFrame, height: number): number {
  return Math.max(0, docLines(frame.doc, frame.aud).length - surfaceRoom(height));
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), Math.max(low, high));
}

export function SurfacePage({ frame, height }: { frame: SurfaceFrame; height: number }): ReactNode {
  const { theme } = useTheme();
  const held = docLines(frame.doc, frame.aud, theme).length;
  const room = surfaceRoom(height);
  const off = clamp(frame.off, 0, Math.max(0, held - room));
  const shown = Math.min(room, held - off);
  const range = held > room ? ` · ${String(off + 1)}-${String(off + shown)}/${String(held)}` : '';

  return (
    <box
      border
      borderStyle="rounded"
      borderColor={pageTone(theme.blue, theme)}
      title={` ${frame.title}${range} `}
      flexDirection="column"
      flexGrow={1}
      overflow="hidden"
      paddingLeft={1}
      paddingRight={1}
    >
      <DocRows doc={frame.doc} audience={frame.aud} from={off} room={room} />
    </box>
  );
}
