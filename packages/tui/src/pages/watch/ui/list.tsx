import type { MouseEvent } from '@opentui/core';
import type { ReactNode } from 'react';

import type { KanbanColumnView } from '../../../shared/model';
import type { WatchMouse } from '../model/mouse.ts';

import { ListRow } from './card-row.tsx';

export function ListView({
  columns,
  now,
  chosenKey,
  mouse,
}: {
  columns: KanbanColumnView[];
  now: string;
  chosenKey: string | undefined;
  mouse: WatchMouse;
}): ReactNode {
  const cards = columns.flatMap((column) => column.cards);

  return (
    <box
      flexDirection="column"
      paddingTop={1}
      onMouseScroll={(event: MouseEvent) => {
        const direction = event.scroll?.direction;

        if (direction !== undefined) {
          mouse.listWheel(direction);
        }
      }}
    >
      {cards.map(
        (card): ReactNode => (
          <ListRow
            key={card.key}
            card={card}
            now={now}
            chosen={card.key === chosenKey}
            onPress={() => {
              mouse.listRow(card.key);
            }}
          />
        ),
      )}
    </box>
  );
}
