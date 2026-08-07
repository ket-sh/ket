import type { ReactNode } from 'react';

import type { Frame } from '../model/frames.ts';

import { lerpHex } from '../../../shared/lib';
import { BASE, GREEN, SUBTEXT, TEXT, YELLOW } from '../../../shared/theme';

type EditFrame = Extract<Frame, { kind: 'edit' }>;

const FLASH_TICKS = 8;

function editorRoom(height: number): number {
  return Math.max(3, height - 5);
}

function CursorLine({ line, c }: { line: string; c: number }): ReactNode {
  const at = Math.min(c, line.length);
  const under = line.slice(at, at + 1);

  return (
    <text wrapMode="none">
      <span fg={TEXT}>{line.slice(0, at)}</span>
      <span fg={BASE} bg={YELLOW}>
        {under === '' ? ' ' : under}
      </span>
      <span fg={TEXT}>{line.slice(at + 1)}</span>
    </text>
  );
}

function savedFlash(frame: EditFrame, tick: number): boolean {
  return frame.savedAt !== undefined && tick - frame.savedAt < FLASH_TICKS;
}

function draftLine(frame: EditFrame, line: string, at: number): ReactNode {
  if (at === frame.draft.cur.l) {
    return <CursorLine key={String(at)} line={line} c={frame.draft.cur.c} />;
  }

  return (
    <text key={String(at)} wrapMode="none" fg={SUBTEXT}>
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
  const room = editorRoom(height);
  const start = Math.max(0, frame.draft.cur.l - room + 1);
  const shown = frame.draft.lines.slice(start, start + room);
  const mark = frame.dirty ? ' ●' : '';

  return (
    <box
      border
      borderStyle="rounded"
      borderColor={lerpHex(GREEN, BASE, 0.35)}
      title={` ${frame.item} · ${frame.name}${mark} `}
      flexDirection="column"
      flexGrow={1}
      overflow="hidden"
      paddingLeft={1}
      paddingRight={1}
    >
      {shown.map((line, index): ReactNode => draftLine(frame, line, start + index))}
      {savedFlash(frame, tick) ? (
        <text wrapMode="none">
          <span fg={BASE} bg={GREEN}>
            {' saved ✓ '}
          </span>
        </text>
      ) : null}
    </box>
  );
}
