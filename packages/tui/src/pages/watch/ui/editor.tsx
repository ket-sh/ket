import type { ReactNode } from 'react';

import type { Frame } from '../model/frames.ts';

import { useTheme } from '../../../shared/theme';
import { pageRoom, pageTone } from './surface.tsx';

type EditFrame = Extract<Frame, { kind: 'edit' }>;

const FLASH_TICKS = 8;

function CursorLine({ line, c }: { line: string; c: number }): ReactNode {
  const { theme } = useTheme();
  const at = Math.min(c, line.length);
  const under = line.slice(at, at + 1);

  return (
    <text wrapMode="none">
      <span fg={theme.text}>{line.slice(0, at)}</span>
      <span fg={theme.base} bg={theme.yellow}>
        {under === '' ? ' ' : under}
      </span>
      <span fg={theme.text}>{line.slice(at + 1)}</span>
    </text>
  );
}

function savedFlash(frame: EditFrame, tick: number): boolean {
  return frame.savedAt !== undefined && tick - frame.savedAt < FLASH_TICKS;
}

function DraftLine({ frame, line, at }: { frame: EditFrame; line: string; at: number }): ReactNode {
  const { theme } = useTheme();

  if (at === frame.draft.cur.l) {
    return <CursorLine line={line} c={frame.draft.cur.c} />;
  }

  return (
    <text wrapMode="none" fg={theme.subtext}>
      {line === '' ? ' ' : line}
    </text>
  );
}

export function EditorPage({
  frame,
  tick,
  height,
}: {
  frame: EditFrame;
  tick: number;
  height: number;
}): ReactNode {
  const { theme } = useTheme();
  const room = pageRoom(height, 3);
  const start = Math.max(0, frame.draft.cur.l - room + 1);
  const shown = frame.draft.lines.slice(start, start + room);
  const mark = frame.dirty ? ' ●' : '';

  return (
    <box
      border
      borderStyle="rounded"
      borderColor={pageTone(theme.green, theme)}
      title={` ${frame.item} · ${frame.name}${mark} `}
      flexDirection="column"
      flexGrow={1}
      overflow="hidden"
      paddingLeft={1}
      paddingRight={1}
    >
      {shown.map(
        (line, index): ReactNode => (
          <DraftLine key={String(start + index)} frame={frame} line={line} at={start + index} />
        ),
      )}
      {savedFlash(frame, tick) ? (
        <text wrapMode="none">
          <span fg={theme.base} bg={theme.green}>
            {' saved ✓ '}
          </span>
        </text>
      ) : null}
    </box>
  );
}
