import type { ReactNode } from 'react';

import type { KanbanCardView, KanbanColumnView, UnfiledShelfView } from '../../../shared/model';
import type { WatchMouse } from '../model/mouse.ts';
import type { ShelfSeat } from '../model/shelf-seat.ts';
import type { FlatRowKind } from './card-row.tsx';

import { useTheme } from '../../../shared/theme';
import { backlogOf } from '../lib/backlog.ts';
import { archiveOf } from '../lib/shipped.ts';
import { FlatRows } from './card-row.tsx';
import { groundedOn } from './pane-mouse.ts';
import { UnfiledRows } from './unfiled-rows.tsx';

interface ShelfProps {
  columns: KanbanColumnView[];
  now: string;
  chosenKey: string | undefined;
  mouse: WatchMouse;
}

function CardShelf({
  title,
  kind,
  cards,
  shelf,
}: {
  title: string;
  kind: FlatRowKind;
  cards: KanbanCardView[];
  shelf: ShelfProps;
}): ReactNode {
  const { theme } = useTheme();

  return (
    <box
      flexDirection="column"
      border
      borderStyle="rounded"
      borderColor={theme.surface1}
      title={title}
      paddingLeft={1}
      paddingRight={1}
      onMouseDown={groundedOn(shelf.mouse)}
    >
      <FlatRows
        kind={kind}
        cards={cards}
        now={shelf.now}
        chosenKey={shelf.chosenKey}
        onRow={shelf.mouse.backlogRow}
      />
    </box>
  );
}

function UnfiledShelf({
  unfiled,
  shelfSeat,
}: {
  unfiled: UnfiledShelfView;
  shelfSeat: ShelfSeat;
}): ReactNode {
  const { theme } = useTheme();

  if (shelfSeat.rows.length === 0) {
    return null;
  }

  return (
    <box
      flexDirection="column"
      border
      borderStyle="rounded"
      borderColor={theme.surface1}
      title={` unfiled · ${unfiled.release?.name ?? 'unassigned'} · ${String(shelfSeat.rows.length)} to file `}
      paddingLeft={1}
      paddingRight={1}
    >
      <UnfiledRows stories={shelfSeat.rows} chosenId={shelfSeat.chosen?.id} />
    </box>
  );
}

export function BacklogView(
  shelf: ShelfProps & { unfiled: UnfiledShelfView; shelfSeat: ShelfSeat },
): ReactNode {
  const cards = backlogOf(shelf.columns);

  return (
    <>
      <CardShelf
        title={` backlog · ${String(cards.length)} waiting `}
        kind="backlog"
        cards={cards}
        shelf={shelf}
      />
      <UnfiledShelf unfiled={shelf.unfiled} shelfSeat={shelf.shelfSeat} />
    </>
  );
}

export function ArchiveView(shelf: ShelfProps): ReactNode {
  const cards = archiveOf(shelf.columns);

  return (
    <CardShelf
      title={` archive · ${String(cards.length)} shipped `}
      kind="archive"
      cards={cards}
      shelf={shelf}
    />
  );
}
