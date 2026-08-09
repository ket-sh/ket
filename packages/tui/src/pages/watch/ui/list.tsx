import type { ReactNode } from 'react';

import type { KanbanColumnView } from '../../../shared/model';

import { FlatRows } from './card-row.tsx';

export function ListView({
  columns,
  now,
  chosenKey,
  onRow,
  onWheel,
}: {
  columns: KanbanColumnView[];
  now: string;
  chosenKey: string | undefined;
  onRow: (key: string) => void;
  onWheel: (direction: 'up' | 'down' | 'left' | 'right') => void;
}): ReactNode {
  const cards = columns.flatMap((column) => column.cards);

  return (
    <box
      flexDirection="column"
      paddingTop={1}
      onMouseScroll={(event) => {
        const direction = event.scroll?.direction;

        if (direction !== undefined) {
          onWheel(direction);
        }
      }}
    >
      <FlatRows kind="list" cards={cards} now={now} chosenKey={chosenKey} onRow={onRow} />
    </box>
  );
}
