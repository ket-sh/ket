import type { KanbanCardView, KanbanColumnView } from '../../../shared/model';

// A backlog is read for what to pull next, so the stage nearest to starting
// leads it.
const QUEUED = ['triaged', 'idea'];

export function backlogOf(columns: KanbanColumnView[]): KanbanCardView[] {
  return QUEUED.flatMap(
    (status) => columns.find((column) => column.status === status)?.cards ?? [],
  );
}

export function backlogLeftOf(columns: KanbanColumnView[], key: string | undefined): number {
  const cards = backlogOf(columns);
  const at = cards.findIndex((card) => card.key === key);

  return at < 0 ? 0 : cards.length - 1 - at;
}
