import type { MouseEvent } from '@opentui/core';
import type { ReactNode } from 'react';

import type { KanbanColumnView } from '../../../shared/model';
import type { WatchMouse } from '../model/mouse.ts';

import { useTheme } from '../../../shared/theme';
import { backlogOf } from '../lib/backlog.ts';
import { BacklogRow } from './card-row.tsx';

export function BacklogView({
  columns,
  chosenKey,
  mouse,
}: {
  columns: KanbanColumnView[];
  chosenKey: string | undefined;
  mouse: WatchMouse;
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
      onMouseDown={(event: MouseEvent) => {
        event.stopPropagation();
        mouse.heldGround();
      }}
    >
      {cards.map(
        (card): ReactNode => (
          <BacklogRow
            key={card.key}
            card={card}
            chosen={card.key === chosenKey}
            onPress={() => {
              mouse.backlogRow(card.key);
            }}
          />
        ),
      )}
    </box>
  );
}
