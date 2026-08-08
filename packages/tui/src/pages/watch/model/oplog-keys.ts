import type { OplogEventView } from '../../../shared/model';
import type { FrameStack } from './frames.ts';

import { seatedRow } from '../lib/oplog.ts';

function dived(stack: FrameStack, shown: OplogEventView[]): void {
  if (stack.top.kind === 'oplog') {
    stack.dive(shown[seatedRow(stack.top.sel, shown.length)]?.item);
  }
}

const LOG_MOVES: Record<string, (stack: FrameStack, shown: OplogEventView[]) => void> = {
  escape: (stack) => {
    stack.pop();
  },
  up: (stack, shown) => {
    stack.logSlide(-1, shown.length - 1);
  },
  down: (stack, shown) => {
    stack.logSlide(1, shown.length - 1);
  },
  return: dived,
  enter: dived,
};

export function oplogPress(name: string, stack: FrameStack, shown: OplogEventView[]): void {
  LOG_MOVES[name]?.(stack, shown);
}
