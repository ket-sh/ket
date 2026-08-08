import type { KanbanCardView, KanbanColumnView } from '../../../shared/model';

// A backlog is read for what to pull next, so the stage nearest to starting
// leads it.
const QUEUED = ['triaged', 'idea'];

export function backlogOf(columns: KanbanColumnView[]): KanbanCardView[] {
  return QUEUED.flatMap(
    (status) => columns.find((column) => column.status === status)?.cards ?? [],
  );
}
