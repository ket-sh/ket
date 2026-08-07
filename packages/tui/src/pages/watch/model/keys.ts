import type { Direction } from './compass.ts';
import type { FrameStack } from './frames.ts';
import type { Seat } from './seat.ts';

import { asDirection, DELTA } from './compass.ts';

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

function boardPress(name: string, stack: FrameStack, seat: Seat): void {
  if (name === 'return' || name === 'enter') {
    stack.dive(seat.chosen?.key);

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

export interface PressDeps {
  onQuit: () => void;
  refresh: () => void;
  stack: FrameStack;
  seat: Seat;
  most: number;
}

export function press(name: string, deps: PressDeps): void {
  if (name === 'q') {
    deps.onQuit();

    return;
  }

  if (name === 'r') {
    deps.refresh();

    return;
  }

  if (deps.stack.top.kind === 'journey') {
    journeyPress(name, deps.stack);

    return;
  }

  if (deps.stack.top.kind === 'surface') {
    surfacePress(name, deps.stack, deps.most);

    return;
  }

  boardPress(name, deps.stack, deps.seat);
}
