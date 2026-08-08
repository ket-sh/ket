import type { Pressed } from './compass.ts';
import type { PressDeps } from './keys.ts';

import { press } from './keys.ts';

export interface WatchMouse {
  boardCard: (key: string) => void;
  laneHead: (key: string | undefined) => void;
  hint: (pressed: Pressed) => void;
}

export function mouseOf(deps: PressDeps): WatchMouse {
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
