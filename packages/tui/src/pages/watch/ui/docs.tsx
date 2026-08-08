import type { ReactNode } from 'react';

import type { DocsCatalogView, DocsRowView } from '../../../shared/model';
import type { Theme } from '../../../shared/theme';
import type { DocsLine } from '../lib/docs.ts';
import type { DocsFocus } from '../model/frames.ts';
import type { WatchMouse } from '../model/mouse.ts';

import { useTheme } from '../../../shared/theme';
import { catalogLines, catalogRows, detailLinesOf, detailRoomOf, rotWordOf } from '../lib/docs.ts';
import { seatedRow } from '../lib/oplog.ts';
import { toneColorOf } from '../lib/pane.ts';
import { groundedOn, pressedRow, wheeledThrough } from './pane-mouse.ts';

const FRAME_ROWS = 2;

function rotColorOf(word: string, theme: Theme): string {
  return word === 'unpinned' ? theme.yellow : theme.red;
}

function CatalogRow({
  row,
  chosen,
  onPress,
}: {
  row: DocsRowView;
  chosen: boolean;
  onPress: () => void;
}): ReactNode {
  const { theme } = useTheme();
  const word = rotWordOf(row);

  return (
    <text wrapMode="none" onMouseDown={pressedRow(onPress)}>
      <span fg={theme.text}>{chosen ? '► ' : '  '}</span>
      <span fg={chosen ? theme.text : theme.subtext}>{row.name}</span>
      {word === '' ? null : <span fg={rotColorOf(word, theme)}>{`  ${word}`}</span>}
    </text>
  );
}

function CatalogLine({
  line,
  chosen,
  mouse,
}: {
  line: DocsLine;
  chosen: number;
  mouse: WatchMouse;
}): ReactNode {
  const { theme } = useTheme();

  if (line.kind === 'header') {
    return (
      <text wrapMode="none" fg={theme.overlay}>
        {line.label}
      </text>
    );
  }

  return (
    <CatalogRow
      row={line.row}
      chosen={line.at === chosen}
      onPress={() => {
        mouse.docsRow(line.at);
      }}
    />
  );
}

function shownWindowOf(lines: DocsLine[], chosen: number, room: number): DocsLine[] {
  const lineAt = lines.findIndex((line) => line.kind === 'row' && line.at === chosen);
  const from = Math.max(0, lineAt - room + 1);

  return lines.slice(from, from + room);
}

interface ShelfProps {
  catalog: DocsCatalogView;
  held: boolean;
  chosen: number;
  room: number;
  mouse: WatchMouse;
}

function CatalogPane({ catalog, held, chosen, room, mouse }: ShelfProps): ReactNode {
  const { theme } = useTheme();

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
      onMouseDown={groundedOn(mouse)}
      onMouseScroll={wheeledThrough(mouse.docsWheel)}
    >
      {shownWindowOf(catalogLines(catalog), chosen, room).map(
        (line, seatAt): ReactNode => (
          <CatalogLine key={String(seatAt)} line={line} chosen={chosen} mouse={mouse} />
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
  mouse: WatchMouse;
}

function DetailPane({ row, held, now, width, mouse }: DetailProps): ReactNode {
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
      onMouseDown={groundedOn(mouse)}
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
  catalog,
  sel,
  focus,
  now,
  width,
  height,
  mouse,
}: {
  catalog: DocsCatalogView;
  sel: number;
  focus: DocsFocus;
  now: string;
  width: number;
  height: number;
  mouse: WatchMouse;
}): ReactNode {
  const rows = catalogRows(catalog);
  const chosen = seatedRow(sel, rows.length);
  const room = Math.max(1, height - FRAME_ROWS);
  const held = focus === 'detail';

  return (
    <box flexDirection="row">
      <CatalogPane catalog={catalog} held={held} chosen={chosen} room={room} mouse={mouse} />
      <DetailPane row={rows[chosen]} held={held} now={now} width={width} mouse={mouse} />
    </box>
  );
}
