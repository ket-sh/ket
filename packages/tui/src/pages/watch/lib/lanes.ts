import type { KanbanColumnView } from '../../../shared/model';

// OpenTUI draws a box title only when the box spans title.length + 4 cells,
// measured against @opentui/core 0.4.5.
const TITLE_ROOM = 4;

export function laneTitle(column: KanbanColumnView): string {
  return ` ${column.status} ${String(column.cards.length)} `;
}

export function laneLeast(columns: KanbanColumnView[]): number {
  return Math.max(0, ...columns.map((column) => laneTitle(column).length)) + TITLE_ROOM;
}

export function lanesOverflowAcross(columns: KanbanColumnView[], room: number): boolean {
  return columns.length * laneLeast(columns) > room;
}
