import type { GateActionView, KanbanCardView } from '../../../shared/model';
import type { BoardLayout } from './board-layout.ts';
import type { Direction, Pressed } from './compass.ts';
import type { Filter } from './filter.ts';
import type { Frame, FrameStack } from './frames.ts';
import type { Help } from './help.ts';
import type { Palette } from './palette.ts';
import type { Picker } from './picker.ts';
import type { Seat } from './seat.ts';

import { asDirection, DELTA } from './compass.ts';
import { editorPress } from './editor-keys.ts';
import { filterOpened, filterPress } from './filter-keys.ts';
import { ceremonyPress, journeyPress, mapPress, surfacePress } from './frame-keys.ts';
import { helpOpened, helpPress } from './help-keys.ts';
import { paletteOpened, palettePress } from './palette-keys.ts';
import { pickerPress } from './picker-keys.ts';

export const GATE_KEYS: Record<string, GateActionView> = {
  a: 'approve',
  s: 'ship',
  o: 'reopen',
};

function offeredAction(
  name: string,
  chosen: KanbanCardView | undefined,
): GateActionView | undefined {
  const action = GATE_KEYS[name];

  if (action === undefined || chosen === undefined) {
    return undefined;
  }

  return chosen.offers.includes(action) ? action : undefined;
}

function ceremonyOpened(name: string, stack: FrameStack, seat: Seat, tick: number): boolean {
  const action = offeredAction(name, seat.chosen);

  if (action === undefined || seat.chosen === undefined) {
    return false;
  }

  stack.gate(action, seat.chosen, tick);

  return true;
}

function divedIn(name: string, stack: FrameStack, seat: Seat): boolean {
  if (name !== 'return' && name !== 'enter') {
    return false;
  }

  stack.dive(seat.chosen?.key);

  return true;
}

function walkedBoard(direction: Direction, seat: Seat, layout: BoardLayout): void {
  if (layout === 'kanban') {
    seat.move(DELTA[direction]);

    return;
  }

  if (direction === 'up' || direction === 'down') {
    seat.slide(direction === 'up' ? -1 : 1);
  }
}

const BOARD_CHORDS: Record<string, (deps: PressDeps) => void> = {
  v: (deps) => {
    deps.swap();
  },
  b: (deps) => {
    deps.queue();
  },
  m: (deps) => {
    deps.stack.openMap();
  },
};

function boardPress(name: string, deps: PressDeps): void {
  if (divedIn(name, deps.stack, deps.seat)) {
    return;
  }

  if (ceremonyOpened(name, deps.stack, deps.seat, deps.tick)) {
    return;
  }

  const chord = BOARD_CHORDS[name];

  if (chord !== undefined) {
    chord(deps);

    return;
  }

  const direction = asDirection(name);

  if (direction !== undefined) {
    walkedBoard(direction, deps.seat, deps.layout);
  }
}

export interface PressDeps {
  onQuit: () => void;
  refresh: () => void;
  stack: FrameStack;
  seat: Seat;
  most: number;
  tick: number;
  layout: BoardLayout;
  swap: () => void;
  queue: () => void;
  picker: Picker;
  filter: Filter;
  palette: Palette;
  help: Help;
}

const FRAME_PRESSES: Record<Frame['kind'], (name: string, deps: PressDeps) => void> = {
  board: (name, deps) => {
    boardPress(name, deps);
  },
  journey: (name, deps) => {
    journeyPress(name, deps.stack);
  },
  map: (name, deps) => {
    mapPress(name, deps.stack);
  },
  surface: (name, deps) => {
    surfacePress(name, deps.stack, deps.most);
  },
  gate: (name, deps) => {
    ceremonyPress(name, deps.stack, deps.tick);
  },
  edit: () => undefined,
};

function overlayPress(key: Pressed, deps: PressDeps): boolean {
  if (deps.palette.at !== undefined) {
    palettePress(key, deps.palette);

    return true;
  }

  if (deps.picker.at !== undefined) {
    pickerPress(key.name, deps.picker);

    return true;
  }

  if (deps.help.on) {
    helpPress(key, deps.help);

    return true;
  }

  return false;
}

function heldPress(key: Pressed, deps: PressDeps): boolean {
  if (overlayPress(key, deps)) {
    return true;
  }

  if (deps.stack.top.kind === 'edit') {
    editorPress(key, deps.stack, deps.tick);

    return true;
  }

  if (deps.filter.typing) {
    filterPress(key, deps.filter);

    return true;
  }

  return false;
}

const GLOBAL_KEYS: Record<string, (deps: PressDeps) => void> = {
  q: (deps) => {
    deps.onQuit();
  },
  r: (deps) => {
    deps.refresh();
  },
  t: (deps) => {
    deps.picker.open();
  },
};

function overlayOpened(key: Pressed, deps: PressDeps): boolean {
  const kind = deps.stack.top.kind;

  return (
    filterOpened(key, kind, deps.layout, deps.filter) ||
    paletteOpened(key, kind, deps.palette) ||
    helpOpened(key, kind, deps.help)
  );
}

export function press(key: Pressed, deps: PressDeps): void {
  if (heldPress(key, deps)) {
    return;
  }

  const answered = GLOBAL_KEYS[key.name];

  if (answered !== undefined) {
    answered(deps);

    return;
  }

  if (overlayOpened(key, deps)) {
    return;
  }

  FRAME_PRESSES[deps.stack.top.kind](key.name, deps);
}
