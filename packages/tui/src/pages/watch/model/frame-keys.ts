import type { Direction } from './compass.ts';
import type { Frame, FrameStack } from './frames.ts';

import { asDirection } from './compass.ts';

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
  f: (stack) => {
    stack.widen();
  },
};

const READ_KEYS: Record<string, Direction> = {
  j: 'down',
  k: 'up',
};

function readDirectionOf(name: string, top: Frame): Direction | undefined {
  return top.kind === 'journey' && top.focus === 'content' ? READ_KEYS[name] : undefined;
}

export function journeyPress(name: string, stack: FrameStack): void {
  const answer = JOURNEY_KEYS[name];

  if (answer !== undefined) {
    answer(stack);

    return;
  }

  const direction = readDirectionOf(name, stack.top) ?? asDirection(name);

  if (direction !== undefined) {
    stack.walk(direction);
  }
}

export function mapPress(name: string, stack: FrameStack): void {
  if (name === 'escape') {
    stack.pop();

    return;
  }

  stack.mapWalk(name);
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

export function surfacePress(name: string, stack: FrameStack, most: number): void {
  SURFACE_MOVES[name]?.(stack, most);
}

export function ceremonyPress(name: string, stack: FrameStack, tick: number): void {
  if (name === 'escape') {
    stack.pop();

    return;
  }

  if (name === 'return' || name === 'enter') {
    stack.pass(tick);
  }
}
