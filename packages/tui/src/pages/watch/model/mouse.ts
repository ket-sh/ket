import type { Pressed } from './compass.ts';
import type { JourneyTab } from './frames.ts';
import type { PressDeps } from './keys.ts';

import { neighborOf, placedOf } from '../lib/layout.ts';
import { press } from './keys.ts';

type WheelDirection = 'up' | 'down' | 'left' | 'right';

const ACROSS: Record<WheelDirection, 'left' | 'right'> = {
  up: 'left',
  left: 'left',
  down: 'right',
  right: 'right',
};

function overlayHeld(deps: PressDeps): boolean {
  return (
    deps.palette.at !== undefined ||
    deps.picker.at !== undefined ||
    deps.help.on ||
    deps.filter.typing
  );
}

function shutChooser(deps: PressDeps): boolean {
  if (deps.palette.at !== undefined) {
    deps.palette.close();

    return true;
  }

  if (deps.picker.at !== undefined) {
    deps.picker.close();

    return true;
  }

  return false;
}

function overlayShut(deps: PressDeps): boolean {
  if (shutChooser(deps)) {
    return true;
  }

  if (deps.help.on) {
    deps.help.close();

    return true;
  }

  if (deps.filter.typing) {
    deps.filter.clear();

    return true;
  }

  return false;
}

interface BoardMouse {
  boardCard: (key: string) => void;
  laneHead: (key: string | undefined) => void;
  backlogRow: (key: string) => void;
  hint: (pressed: Pressed) => void;
}

function boardMouseOf(deps: PressDeps): BoardMouse {
  const boardCard = (key: string): void => {
    if (overlayShut(deps) || deps.stack.top.kind !== 'board') {
      return;
    }

    if (deps.seat.chosen?.key === key) {
      deps.stack.dive(key);

      return;
    }

    deps.seat.seek(key);
  };

  const laneHead = (key: string | undefined): void => {
    if (overlayShut(deps) || deps.stack.top.kind !== 'board') {
      return;
    }

    if (key !== undefined) {
      deps.seat.seek(key);
    }
  };

  const backlogRow = (key: string): void => {
    if (overlayShut(deps) || deps.stack.top.kind !== 'board') {
      return;
    }

    deps.seat.seek(key);
    deps.stack.dive(key);
  };

  const hint = (pressed: Pressed): void => {
    press(pressed, deps);
  };

  return { boardCard, laneHead, backlogRow, hint };
}

interface JourneyMouse {
  stage: (id: string) => void;
  tabLabel: (tab: JourneyTab) => void;
  paneChildren: () => void;
  canvasWheel: (direction: WheelDirection) => void;
}

function journeyMouseOf(deps: PressDeps): JourneyMouse {
  const stage = (id: string): void => {
    if (!overlayShut(deps)) {
      deps.stack.aim(id);
    }
  };

  const tabLabel = (tab: JourneyTab): void => {
    if (!overlayShut(deps)) {
      deps.stack.showTab(tab);
    }
  };

  const paneChildren = (): void => {
    if (!overlayShut(deps)) {
      deps.stack.showTab('children');
    }
  };

  const canvasWheel = (direction: WheelDirection): void => {
    const top = deps.stack.top;

    if (overlayHeld(deps) || top.kind !== 'journey') {
      return;
    }

    deps.stack.aim(neighborOf(placedOf(top.journey).nodes, top.sel, ACROSS[direction]));
  };

  return { stage, tabLabel, paneChildren, canvasWheel };
}

interface OverlayMouse {
  paletteRow: (at: number) => void;
  pickerRow: (at: number) => void;
  heldGround: () => void;
  outside: () => void;
}

function overlayMouseOf(deps: PressDeps): OverlayMouse {
  const paletteRow = (at: number): void => {
    deps.palette.pick(at);
  };

  const pickerRow = (at: number): void => {
    deps.picker.pick(at);
  };

  const heldGround = (): void => {
    overlayShut(deps);
  };

  const outside = (): void => {
    if (overlayShut(deps)) {
      return;
    }

    if (deps.stack.top.kind === 'board' && deps.layout === 'backlog') {
      deps.queue();
    }
  };

  return { paletteRow, pickerRow, heldGround, outside };
}

export interface WatchMouse extends BoardMouse, JourneyMouse, OverlayMouse {}

export function mouseOf(deps: PressDeps): WatchMouse {
  return { ...boardMouseOf(deps), ...journeyMouseOf(deps), ...overlayMouseOf(deps) };
}
