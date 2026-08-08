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

interface BoardMouse {
  boardCard: (key: string) => void;
  laneHead: (key: string | undefined) => void;
  hint: (pressed: Pressed) => void;
}

function boardMouseOf(deps: PressDeps): BoardMouse {
  const boardCard = (key: string): void => {
    if (deps.seat.chosen?.key === key) {
      deps.stack.dive(key);

      return;
    }

    deps.seat.seek(key);
  };

  const laneHead = (key: string | undefined): void => {
    if (key !== undefined) {
      deps.seat.seek(key);
    }
  };

  const hint = (pressed: Pressed): void => {
    press(pressed, deps);
  };

  return { boardCard, laneHead, hint };
}

interface JourneyMouse {
  stage: (id: string) => void;
  tabLabel: (tab: JourneyTab) => void;
  paneChildren: () => void;
  canvasWheel: (direction: WheelDirection) => void;
}

function journeyMouseOf(deps: PressDeps): JourneyMouse {
  const stage = (id: string): void => {
    deps.stack.aim(id);
  };

  const tabLabel = (tab: JourneyTab): void => {
    deps.stack.showTab(tab);
  };

  const paneChildren = (): void => {
    deps.stack.showTab('children');
  };

  const canvasWheel = (direction: WheelDirection): void => {
    const top = deps.stack.top;

    if (top.kind === 'journey') {
      deps.stack.aim(neighborOf(placedOf(top.journey).nodes, top.sel, ACROSS[direction]));
    }
  };

  return { stage, tabLabel, paneChildren, canvasWheel };
}

export interface WatchMouse extends BoardMouse, JourneyMouse {}

export function mouseOf(deps: PressDeps): WatchMouse {
  return { ...boardMouseOf(deps), ...journeyMouseOf(deps) };
}
