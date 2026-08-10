import type { GateActionView, KanbanCardView } from '../../../shared/model';
import type { Direction } from './compass.ts';
import type { FrameStack } from './frames.ts';
import type { PressDeps } from './press-deps.ts';
import type { Seat } from './seat.ts';

import { asDirection, DELTA } from './compass.ts';
import { GATE_KEYS } from './gate-keys.ts';

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

function slidBoard(deps: PressDeps, delta: number): void {
  if (deps.layout === 'backlog' && deps.shelfSeat.walk(delta, deps.filedLeft)) {
    return;
  }

  deps.seat.slide(delta);
}

function walkedBoard(direction: Direction, deps: PressDeps): void {
  if (deps.layout === 'kanban') {
    deps.seat.move(DELTA[direction]);

    return;
  }

  if (direction === 'up' || direction === 'down') {
    slidBoard(deps, direction === 'up' ? -1 : 1);
  }
}

function promoted(deps: PressDeps): void {
  const story = deps.shelfSeat.chosen;

  if (deps.layout === 'backlog' && story !== undefined) {
    deps.stack.promote(story, deps.tick);
  }
}

const BOARD_CHORDS: Record<string, (deps: PressDeps) => void> = {
  v: (deps) => {
    deps.swap();
  },
  b: (deps) => {
    deps.queue();
  },
  x: (deps) => {
    deps.shelve();
  },
  p: promoted,
  u: (deps) => {
    if (deps.layout === 'backlog') {
      deps.shelfSeat.toggleWhole();
    }
  },
  m: (deps) => {
    deps.stack.openMap();
  },
  l: (deps) => {
    deps.stack.openLog();
  },
  d: (deps) => {
    deps.stack.openDocs();
  },
};

export function boardPress(name: string, deps: PressDeps): void {
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
    walkedBoard(direction, deps);
  }
}
