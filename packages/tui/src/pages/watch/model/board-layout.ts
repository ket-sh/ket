import { useState } from 'react';

export type BoardLayout = 'kanban' | 'list' | 'backlog' | 'archive';

export interface Laid {
  layout: BoardLayout;
  swap: () => void;
  queue: () => void;
  shelve: () => void;
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

  const shelve = (): void => {
    setLayout((worn) => (worn === 'archive' ? 'kanban' : 'archive'));
  };

  const wear = (landing: BoardLayout): void => {
    setLayout(landing);
  };

  return { layout, swap, queue, shelve, wear };
}
