import type { ReactNode } from 'react';

import type { DocsRowView } from '../../../shared/model';
import type { Theme } from '../../../shared/theme';
import type { DocsLine } from '../lib/docs.ts';
import type { Frame } from '../model/frames.ts';

import { useTheme } from '../../../shared/theme';
import { catalogLines, catalogRows, detailLinesOf, detailRoomOf, rotWordOf } from '../lib/docs.ts';
import { seatedRow } from '../lib/oplog.ts';
import { toneColorOf } from '../lib/pane.ts';

type DocsFrame = Extract<Frame, { kind: 'docs' }>;

const FRAME_ROWS = 2;

function rotColorOf(word: string, theme: Theme): string {
  return word === 'unpinned' ? theme.yellow : theme.red;
}

function CatalogRow({ row, chosen }: { row: DocsRowView; chosen: boolean }): ReactNode {
  const { theme } = useTheme();
  const word = rotWordOf(row);

  return (
    <text wrapMode="none">
      <span fg={theme.text}>{chosen ? '► ' : '  '}</span>
      <span fg={chosen ? theme.text : theme.subtext}>{row.name}</span>
      {word === '' ? null : <span fg={rotColorOf(word, theme)}>{`  ${word}`}</span>}
    </text>
  );
}

function CatalogLine({ line, chosen }: { line: DocsLine; chosen: number }): ReactNode {
  const { theme } = useTheme();

  if (line.kind === 'header') {
    return (
      <text wrapMode="none" fg={theme.overlay}>
        {line.label}
      </text>
    );
  }

  return <CatalogRow row={line.row} chosen={line.at === chosen} />;
}

function shownWindowOf(lines: DocsLine[], chosen: number, room: number): DocsLine[] {
  const lineAt = lines.findIndex((line) => line.kind === 'row' && line.at === chosen);
  const from = Math.max(0, lineAt - room + 1);

  return lines.slice(from, from + room);
}

interface ShelfProps {
  frame: DocsFrame;
  chosen: number;
  room: number;
}

function CatalogPane({ frame, chosen, room }: ShelfProps): ReactNode {
  const { theme } = useTheme();
  const held = frame.focus === 'detail';

  return (
    <box
      flexGrow={1}
      flexDirection="column"
      border
      borderStyle="rounded"
      borderColor={held ? theme.surface1 : theme.blue}
      title=" docs "
      paddingLeft={1}
      paddingRight={1}
      overflow="hidden"
    >
      {shownWindowOf(catalogLines(frame.catalog), chosen, room).map(
        (line, seatAt): ReactNode => (
          <CatalogLine key={String(seatAt)} line={line} chosen={chosen} />
        ),
      )}
    </box>
  );
}

interface DetailProps {
  row: DocsRowView | undefined;
  held: boolean;
  now: string;
  width: number;
}

function DetailPane({ row, held, now, width }: DetailProps): ReactNode {
  const { theme } = useTheme();

  return (
    <box
      width={detailRoomOf(width)}
      flexDirection="column"
      border
      borderStyle="rounded"
      borderColor={held ? theme.blue : theme.surface1}
      title=" detail "
      paddingLeft={1}
      paddingRight={1}
      overflow="hidden"
    >
      {detailLinesOf(row, now).map(
        (line, at): ReactNode => (
          <text key={String(at)} wrapMode="none" fg={toneColorOf(line.tone, theme)}>
            {line.text}
          </text>
        ),
      )}
    </box>
  );
}

export function DocsView({
  frame,
  now,
  width,
  height,
}: {
  frame: DocsFrame;
  now: string;
  width: number;
  height: number;
}): ReactNode {
  const rows = catalogRows(frame.catalog);
  const chosen = seatedRow(frame.sel, rows.length);
  const room = Math.max(1, height - FRAME_ROWS);

  return (
    <box flexDirection="row">
      <CatalogPane frame={frame} chosen={chosen} room={room} />
      <DetailPane row={rows[chosen]} held={frame.focus === 'detail'} now={now} width={width} />
    </box>
  );
}
