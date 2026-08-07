import type { Direction } from './compass.ts';
import type { FrameStack } from './frames.ts';
import type { Seat } from './seat.ts';

import { asDirection, DELTA } from './compass.ts';

function journeyPress(name: string, stack: FrameStack): void {
  if (name === 'escape') {
    stack.pop();

    return;
  }

  const direction: Direction | undefined = asDirection(name);

  if (direction !== undefined) {
    stack.walk(direction);
  }
}

function boardPress(name: string, stack: FrameStack, seat: Seat): void {
  if (name === 'return' || name === 'enter') {
    stack.dive(seat.chosen);

    return;
  }

  const direction = asDirection(name);

  if (direction !== undefined) {
    seat.move(DELTA[direction]);
  }
}

export interface PressDeps {
  onQuit: () => void;
  refresh: () => void;
  stack: FrameStack;
  seat: Seat;
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

  boardPress(name, deps.stack, deps.seat);
}
