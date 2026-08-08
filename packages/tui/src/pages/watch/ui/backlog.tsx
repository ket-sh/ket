import type { ReactNode } from 'react';

import type { KanbanColumnView } from '../../../shared/model';

import { useTheme } from '../../../shared/theme';
import { backlogOf } from '../lib/backlog.ts';
import { BacklogRow } from './card-row.tsx';

export function BacklogView({
  columns,
  chosenKey,
}: {
  columns: KanbanColumnView[];
  chosenKey: string | undefined;
}): ReactNode {
  const { theme } = useTheme();
  const cards = backlogOf(columns);

  return (
    <box
      flexDirection="column"
      border
      borderStyle="rounded"
      borderColor={theme.surface1}
      title={` backlog · ${String(cards.length)} waiting `}
      paddingLeft={1}
      paddingRight={1}
    >
      {cards.map(
        (card): ReactNode => (
          <BacklogRow key={card.key} card={card} chosen={card.key === chosenKey} />
        ),
      )}
    </box>
  );
}
