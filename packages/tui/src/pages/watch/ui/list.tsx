import type { ReactNode } from 'react';

import type { KanbanColumnView } from '../../../shared/model';

import { ListRow } from './card-row.tsx';

export function ListView({
  columns,
  now,
  chosenKey,
}: {
  columns: KanbanColumnView[];
  now: string;
  chosenKey: string | undefined;
}): ReactNode {
  const cards = columns.flatMap((column) => column.cards);

  return (
    <box flexDirection="column" paddingTop={1}>
      {cards.map(
        (card): ReactNode => (
          <ListRow key={card.key} card={card} now={now} chosen={card.key === chosenKey} />
        ),
      )}
    </box>
  );
}
