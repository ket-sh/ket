import type { Pressed } from './compass.ts';
import type { FrameStack } from './frames.ts';

import { erased, inserted, moved, split } from '../lib/edit.ts';

const EDITOR_MOVES: Record<string, (stack: FrameStack) => void> = {
  escape: (stack) => {
    stack.pop();
  },
  backspace: (stack) => {
    stack.revise(erased);
  },
  return: (stack) => {
    stack.revise(split);
  },
  enter: (stack) => {
    stack.revise(split);
  },
  up: (stack) => {
    stack.revise((draft) => moved(draft, 'up'));
  },
  down: (stack) => {
    stack.revise((draft) => moved(draft, 'down'));
  },
  left: (stack) => {
    stack.revise((draft) => moved(draft, 'left'));
  },
  right: (stack) => {
    stack.revise((draft) => moved(draft, 'right'));
  },
};

function typedInto(key: Pressed, stack: FrameStack): void {
  if (!key.ctrl && key.seq.length === 1 && key.seq >= ' ') {
    stack.revise((draft) => inserted(draft, key.seq));
  }
}

export function editorPress(key: Pressed, stack: FrameStack, tick: number): void {
  if (key.ctrl && key.name === 's') {
    stack.save(tick);

    return;
  }

  const move = EDITOR_MOVES[key.name];

  if (move !== undefined) {
    move(stack);

    return;
  }

  typedInto(key, stack);
}
