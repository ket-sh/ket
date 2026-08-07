import type { KanbanColumnView } from '../../../shared/model';

const BORDERS = 2;

export function laneTitle(column: KanbanColumnView): string {
  return ` ${column.status} ${String(column.cards.length)} `;
}

export function laidInRow(columns: KanbanColumnView[], room: number): boolean {
  const widest = Math.max(0, ...columns.map((column) => laneTitle(column).length));

  return room >= columns.length * (widest + BORDERS);
}
