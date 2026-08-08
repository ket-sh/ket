import type {
  DocsCatalogView,
  DocsNodeRowView,
  DocsPageRowView,
  DocsRecordRowView,
  DocsRowView,
  DocsTouchView,
} from '../../../shared/model';
import type { PaneLine } from './pane.ts';

import { ageOf } from '../../../shared/lib';

export type DocsLine =
  | { kind: 'header'; label: string }
  | { kind: 'row'; row: DocsRowView; at: number };

export function catalogRows(catalog: DocsCatalogView): DocsRowView[] {
  return catalog.groups.flatMap((group) => group.rows);
}

export function catalogLines(catalog: DocsCatalogView): DocsLine[] {
  const lines: DocsLine[] = [];
  let at = 0;

  for (const group of catalog.groups) {
    lines.push({ kind: 'header', label: group.label });

    for (const row of group.rows) {
      lines.push({ kind: 'row', row, at });
      at += 1;
    }
  }

  return lines;
}

export function rotWordOf(row: DocsRowView): string {
  if (row.kind !== 'page' || row.rot === 'fresh') {
    return '';
  }

  return row.rot;
}

function rotLineOf(row: DocsPageRowView): PaneLine {
  if (row.rot === 'broken') {
    return { text: `broken · ${row.broken ?? 'unreadable page'}`, tone: 'alert' };
  }

  if (row.rot === 'stale') {
    return { text: 'stale · the sources moved past the stamp', tone: 'alert' };
  }

  if (row.rot === 'unpinned') {
    return { text: 'unpinned · no sources pinned', tone: 'quiet' };
  }

  return { text: 'fresh · the stamp covers the sources', tone: 'state' };
}

function sourceLines(row: DocsPageRowView): PaneLine[] {
  if (row.sources.length === 0) {
    return [];
  }

  return [
    { text: 'sources', tone: 'state' },
    ...row.sources.map((glob): PaneLine => ({ text: `  ${glob}`, tone: 'quiet' })),
  ];
}

function touchLines(touch: DocsTouchView | undefined, now: string): PaneLine[] {
  if (touch === undefined) {
    return [];
  }

  return [
    { text: `touched ${ageOf(touch.at, now)} by ${touch.by}`, tone: 'quiet' },
    { text: touch.subject, tone: 'quiet' },
  ];
}

function pageLines(row: DocsPageRowView, now: string): PaneLine[] {
  return [
    { text: row.name, tone: 'key' },
    { text: row.path, tone: 'quiet' },
    { text: `category  ${row.category ?? 'none'}`, tone: 'state' },
    rotLineOf(row),
    ...sourceLines(row),
    ...touchLines(row.touch, now),
  ];
}

function recordLines(row: DocsRecordRowView, now: string): PaneLine[] {
  return [
    { text: row.name, tone: 'key' },
    { text: row.path, tone: 'quiet' },
    { text: 'a decision record · never rots', tone: 'state' },
    ...touchLines(row.touch, now),
  ];
}

function listedOr(items: string[], empty: string): PaneLine[] {
  if (items.length === 0) {
    return [{ text: `  ${empty}`, tone: 'quiet' }];
  }

  return items.map((item): PaneLine => ({ text: `  ${item}`, tone: 'quiet' }));
}

function nodeLines(row: DocsNodeRowView): PaneLine[] {
  return [
    { text: row.name, tone: 'key' },
    { text: 'architecture node', tone: 'quiet' },
    { text: 'depends on', tone: 'state' },
    ...listedOr(row.edges, 'nothing inside the workspace'),
    { text: 'intent', tone: 'state' },
    ...listedOr(row.pointers, 'no intent anchors point here'),
  ];
}

export function detailLinesOf(row: DocsRowView | undefined, now: string): PaneLine[] {
  if (row === undefined) {
    return [{ text: 'nothing chosen', tone: 'quiet' }];
  }

  if (row.kind === 'page') {
    return pageLines(row, now);
  }

  return row.kind === 'record' ? recordLines(row, now) : nodeLines(row);
}

export function detailRoomOf(width: number): number {
  return Math.min(48, Math.max(28, Math.floor(width / 3)));
}
