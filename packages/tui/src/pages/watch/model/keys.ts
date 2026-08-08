import type { GateActionView, KanbanCardView } from '../../../shared/model';
import type { BoardLayout } from './board-layout.ts';
import type { Direction, Pressed } from './compass.ts';
import type { Filter } from './filter.ts';
import type { Frame, FrameStack } from './frames.ts';
import type { Palette } from './palette.ts';
import type { Picker } from './picker.ts';
import type { Seat } from './seat.ts';

import { asDirection, DELTA } from './compass.ts';
import { editorPress } from './editor-keys.ts';
import { filterOpened, filterPress } from './filter-keys.ts';
import { paletteOpened, palettePress } from './palette-keys.ts';
import { pickerPress } from './picker-keys.ts';

export const GATE_KEYS: Record<string, GateActionView> = {
  a: 'approve',
  s: 'ship',
  o: 'reopen',
};

const JOURNEY_KEYS: Record<string, (stack: FrameStack) => void> = {
  escape: (stack) => {
    stack.pop();
  },
  return: (stack) => {
    stack.enter();
  },
  enter: (stack) => {
    stack.enter();
  },
  tab: (stack) => {
    stack.tab();
  },
};

function journeyPress(name: string, stack: FrameStack): void {
  const answer = JOURNEY_KEYS[name];

  if (answer !== undefined) {
    answer(stack);

    return;
  }

  const direction: Direction | undefined = asDirection(name);

  if (direction !== undefined) {
    stack.walk(direction);
  }
}

function mapPress(name: string, stack: FrameStack): void {
  if (name === 'escape') {
    stack.pop();

    return;
  }

  stack.mapWalk(name);
}

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

const SURFACE_MOVES: Record<string, (stack: FrameStack, most: number) => void> = {
  escape: (stack) => {
    stack.pop();
  },
  up: (stack, most) => {
    stack.scroll(-1, most);
  },
  down: (stack, most) => {
    stack.scroll(1, most);
  },
  tab: (stack) => {
    stack.tune('toggle');
  },
  left: (stack) => {
    stack.tune('technical');
  },
  right: (stack) => {
    stack.tune('plain');
  },
  e: (stack) => {
    stack.edit();
  },
};

function surfacePress(name: string, stack: FrameStack, most: number): void {
  SURFACE_MOVES[name]?.(stack, most);
}

function ceremonyPress(name: string, stack: FrameStack, tick: number): void {
  if (name === 'escape') {
    stack.pop();

    return;
  }

  if (name === 'return' || name === 'enter') {
    stack.pass(tick);
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

function heldPress(key: Pressed, deps: PressDeps): boolean {
  if (deps.palette.at !== undefined) {
    palettePress(key, deps.palette);

    return true;
  }

  if (deps.picker.at !== undefined) {
    pickerPress(key.name, deps.picker);

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

export function press(key: Pressed, deps: PressDeps): void {
  if (heldPress(key, deps)) {
    return;
  }

  const answered = GLOBAL_KEYS[key.name];

  if (answered !== undefined) {
    answered(deps);

    return;
  }

  if (filterOpened(key, deps.stack.top.kind, deps.layout, deps.filter)) {
    return;
  }

  if (paletteOpened(key, deps.stack.top.kind, deps.palette)) {
    return;
  }

  FRAME_PRESSES[deps.stack.top.kind](key.name, deps);
}
