import type { GateActionView, KanbanCardView } from '../../../shared/model';
import type { Direction } from './compass.ts';
import type { Frame, FrameStack } from './frames.ts';
import type { Seat } from './seat.ts';

import { asDirection, DELTA } from './compass.ts';

export const GATE_KEYS: Record<string, GateActionView> = {
  a: 'approve',
  s: 'ship',
  o: 'reopen',
};

function journeyPress(name: string, stack: FrameStack): void {
  if (name === 'escape') {
    stack.pop();

    return;
  }

  if (name === 'return' || name === 'enter') {
    stack.enter();

    return;
  }

  const direction: Direction | undefined = asDirection(name);

  if (direction !== undefined) {
    stack.walk(direction);
  }
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

function boardPress(name: string, stack: FrameStack, seat: Seat, tick: number): void {
  if (divedIn(name, stack, seat)) {
    return;
  }

  if (ceremonyOpened(name, stack, seat, tick)) {
    return;
  }

  const direction = asDirection(name);

  if (direction !== undefined) {
    seat.move(DELTA[direction]);
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
}

const FRAME_PRESSES: Record<Frame['kind'], (name: string, deps: PressDeps) => void> = {
  board: (name, deps) => {
    boardPress(name, deps.stack, deps.seat, deps.tick);
  },
  journey: (name, deps) => {
    journeyPress(name, deps.stack);
  },
  surface: (name, deps) => {
    surfacePress(name, deps.stack, deps.most);
  },
  gate: (name, deps) => {
    ceremonyPress(name, deps.stack, deps.tick);
  },
};

export function press(name: string, deps: PressDeps): void {
  if (name === 'q') {
    deps.onQuit();

    return;
  }

  if (name === 'r') {
    deps.refresh();

    return;
  }

  FRAME_PRESSES[deps.stack.top.kind](name, deps);
}
