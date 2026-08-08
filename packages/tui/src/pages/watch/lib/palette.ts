import type { GateActionView, KanbanCardView, KanbanColumnView } from '../../../shared/model';

export type PaletteEntry =
  | { kind: 'screen'; screen: 'board' | 'list' | 'backlog' | 'map'; label: string }
  | { kind: 'item'; key: string; status: string; label: string }
  | { kind: 'gate'; gate: GateActionView; key: string; label: string }
  | { kind: 'tool'; tool: 'refresh' | 'themes'; label: string };

const SCREENS: PaletteEntry[] = [
  { kind: 'screen', screen: 'board', label: 'board' },
  { kind: 'screen', screen: 'list', label: 'list' },
  { kind: 'screen', screen: 'backlog', label: 'backlog' },
  { kind: 'screen', screen: 'map', label: 'map' },
];

const TOOLS: PaletteEntry[] = [
  { kind: 'tool', tool: 'refresh', label: 'refresh' },
  { kind: 'tool', tool: 'themes', label: 'themes' },
];

function itemEntries(columns: KanbanColumnView[]): PaletteEntry[] {
  return columns
    .flatMap((column) => column.cards)
    .map((card) => ({
      kind: 'item' as const,
      key: card.key,
      status: card.status,
      label: `${card.key}  ${card.title}`,
    }));
}

function gateEntries(chosen: KanbanCardView | undefined): PaletteEntry[] {
  if (chosen === undefined) {
    return [];
  }

  return chosen.offers.map((gate) => ({
    kind: 'gate' as const,
    gate,
    key: chosen.key,
    label: `${gate} ${chosen.key}`,
  }));
}

export function destinationsOf(
  columns: KanbanColumnView[],
  chosen: KanbanCardView | undefined,
): PaletteEntry[] {
  return [...SCREENS, ...itemEntries(columns), ...gateEntries(chosen), ...TOOLS];
}

interface Thread {
  start: number;
  span: number;
}

function threadOf(label: string, asked: string): Thread | undefined {
  const lowered = label.toLowerCase();
  let at = -1;
  let start = -1;

  for (const glyph of asked) {
    at = lowered.indexOf(glyph, at + 1);

    if (at < 0) {
      return undefined;
    }

    start = start < 0 ? at : start;
  }

  return { start, span: at - start + 1 };
}

function tighterFirst(one: { thread: Thread }, other: { thread: Thread }): number {
  if (one.thread.span !== other.thread.span) {
    return one.thread.span - other.thread.span;
  }

  return one.thread.start - other.thread.start;
}

export function siftedBy<Threaded extends { label: string }>(
  entries: Threaded[],
  query: string,
): Threaded[] {
  const asked = query.trim().toLowerCase();

  if (asked === '') {
    return entries;
  }

  return entries
    .flatMap((entry) => {
      const thread = threadOf(entry.label, asked);

      return thread === undefined ? [] : [{ entry, thread }];
    })
    .toSorted(tighterFirst)
    .map((woven) => woven.entry);
}
