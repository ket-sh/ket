import { useState } from 'react';

import type { KanbanCardView, KanbanColumnView } from '../../../shared/model';
import type { PaletteEntry } from '../lib/palette.ts';
import type { BoardLayout } from './board-layout.ts';
import type { FrameStack } from './frames.ts';
import type { Picker } from './picker.ts';

import { destinationsOf, siftedBy } from '../lib/palette.ts';

export interface Palette {
  at: number | undefined;
  query: string;
  shown: PaletteEntry[];
  begin: () => void;
  type: (glyph: string) => void;
  erase: () => void;
  move: (delta: number) => void;
  choose: () => void;
  pick: (at: number) => void;
  close: () => void;
}

export interface PaletteDeps {
  columns: KanbanColumnView[];
  chosen: KanbanCardView | undefined;
  stack: FrameStack;
  wear: (landing: BoardLayout) => void;
  picker: Picker;
  refresh: () => void;
  tick: number;
}

const SCREEN_GOES: Record<'board' | 'list' | 'backlog' | 'map', (deps: PaletteDeps) => void> = {
  board: (deps) => {
    deps.stack.home();
    deps.wear('kanban');
  },
  list: (deps) => {
    deps.stack.home();
    deps.wear('list');
  },
  backlog: (deps) => {
    deps.stack.home();
    deps.wear('backlog');
  },
  map: (deps) => {
    deps.stack.home();
    deps.stack.openMap();
  },
};

const TOOL_GOES: Record<'refresh' | 'themes', (deps: PaletteDeps) => void> = {
  refresh: (deps) => {
    deps.refresh();
  },
  themes: (deps) => {
    deps.picker.open();
  },
};

function gateWent(entry: Extract<PaletteEntry, { kind: 'gate' }>, deps: PaletteDeps): void {
  const card = deps.columns
    .flatMap((column) => column.cards)
    .find((held) => held.key === entry.key);

  if (card !== undefined) {
    deps.stack.gate(entry.gate, card, deps.tick);
  }
}

function wentTo(entry: PaletteEntry, deps: PaletteDeps): void {
  if (entry.kind === 'screen') {
    SCREEN_GOES[entry.screen](deps);

    return;
  }

  if (entry.kind === 'item') {
    deps.stack.home();
    deps.stack.dive(entry.key);

    return;
  }

  if (entry.kind === 'gate') {
    gateWent(entry, deps);

    return;
  }

  TOOL_GOES[entry.tool](deps);
}

interface Poised {
  at: number;
  query: string;
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), Math.max(low, high));
}

export function usePalette(deps: PaletteDeps): Palette {
  const [poise, setPoise] = useState<Poised | undefined>(undefined);
  const shown =
    poise === undefined ? [] : siftedBy(destinationsOf(deps.columns, deps.chosen), poise.query);

  const begin = (): void => {
    if (deps.stack.top.kind !== 'gate') {
      setPoise({ at: 0, query: '' });
    }
  };

  const move = (delta: number): void => {
    setPoise((held) =>
      held === undefined
        ? held
        : { ...held, at: clamp(held.at + delta, 0, Math.max(0, shown.length - 1)) },
    );
  };

  const choose = (): void => {
    const landing = poise === undefined ? undefined : shown[poise.at];

    if (landing !== undefined) {
      wentTo(landing, deps);
      setPoise(undefined);
    }
  };

  const pick = (at: number): void => {
    const landing = shown[at];

    if (landing !== undefined) {
      wentTo(landing, deps);
      setPoise(undefined);
    }
  };

  return {
    at: poise?.at,
    query: poise?.query ?? '',
    shown,
    begin,
    type: (glyph) => {
      setPoise((held) => (held === undefined ? held : { at: 0, query: held.query + glyph }));
    },
    erase: () => {
      setPoise((held) => (held === undefined ? held : { at: 0, query: held.query.slice(0, -1) }));
    },
    move,
    choose,
    pick,
    close: () => {
      setPoise(undefined);
    },
  };
}
