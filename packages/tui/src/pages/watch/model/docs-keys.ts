import type { FrameStack } from './frames.ts';

function rested(stack: FrameStack): void {
  if (stack.top.kind === 'docs' && stack.top.focus === 'detail') {
    stack.docsFocus('catalog');

    return;
  }

  stack.pop();
}

const DOCS_MOVES: Record<string, (stack: FrameStack, most: number) => void> = {
  escape: (stack) => {
    rested(stack);
  },
  up: (stack, most) => {
    stack.docsSlide(-1, most);
  },
  down: (stack, most) => {
    stack.docsSlide(1, most);
  },
  return: (stack) => {
    stack.docsFocus('detail');
  },
  enter: (stack) => {
    stack.docsFocus('detail');
  },
  right: (stack) => {
    stack.docsFocus('detail');
  },
  left: (stack) => {
    stack.docsFocus('catalog');
  },
};

export function docsPress(name: string, stack: FrameStack, most: number): void {
  DOCS_MOVES[name]?.(stack, most);
}
