import { useState } from 'react';

export type BoardLayout = 'kanban' | 'list' | 'backlog';

export interface Laid {
  layout: BoardLayout;
  swap: () => void;
  queue: () => void;
  wear: (landing: BoardLayout) => void;
}

export function useBoardLayout(): Laid {
  const [layout, setLayout] = useState<BoardLayout>('kanban');

  const swap = (): void => {
    setLayout((worn) => (worn === 'kanban' ? 'list' : 'kanban'));
  };

  const queue = (): void => {
    setLayout((worn) => (worn === 'backlog' ? 'kanban' : 'backlog'));
  };

  const wear = (landing: BoardLayout): void => {
    setLayout(landing);
  };

  return { layout, swap, queue, wear };
}
