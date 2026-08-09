import type { KanbanColumnView } from '../../../shared/model';

// OpenTUI draws a box title only when the box spans title.length + 4 cells,
// measured against @opentui/core 0.4.5.
const TITLE_ROOM = 4;

export function laneTitle(column: KanbanColumnView, total = column.cards.length): string {
  const capped = total > column.cards.length ? ` · last ${String(column.cards.length)}` : '';

  return ` ${column.status} ${String(total)}${capped} `;
}

export function laneTotalsOf(columns: KanbanColumnView[]): Map<string, number> {
  return new Map(columns.map((column) => [column.status, column.cards.length]));
}

function totalFor(column: KanbanColumnView, totals?: Map<string, number>): number {
  return totals?.get(column.status) ?? column.cards.length;
}

export function laneLeast(columns: KanbanColumnView[], totals?: Map<string, number>): number {
  return (
    Math.max(0, ...columns.map((column) => laneTitle(column, totalFor(column, totals)).length)) +
    TITLE_ROOM
  );
}

export function lanesOverflowAcross(
  columns: KanbanColumnView[],
  room: number,
  totals?: Map<string, number>,
): boolean {
  return columns.length * laneLeast(columns, totals) > room;
}
