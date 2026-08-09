import type { KanbanCardView, KanbanColumnView } from '../../../shared/model';

const SHIPPED = 'shipped';

export const SHIPPED_SHOWN = 5;

function newestFirst(cards: KanbanCardView[]): KanbanCardView[] {
  return [...cards].sort((one, other) => (other.since ?? '').localeCompare(one.since ?? ''));
}

export function cappedShipped(columns: KanbanColumnView[]): KanbanColumnView[] {
  return columns.map((column) =>
    column.status === SHIPPED && column.cards.length > SHIPPED_SHOWN
      ? { ...column, cards: newestFirst(column.cards).slice(0, SHIPPED_SHOWN) }
      : column,
  );
}

export function archiveOf(columns: KanbanColumnView[]): KanbanCardView[] {
  return newestFirst(columns.find((column) => column.status === SHIPPED)?.cards ?? []);
}
