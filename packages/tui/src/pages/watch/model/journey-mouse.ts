import type { Audience } from '../lib/lines.ts';
import type { WheelDirection } from './compass.ts';
import type { JourneyTab } from './frames.ts';
import type { PressDeps } from './keys.ts';

import { neighborOf, placedOf } from '../lib/layout.ts';
import { ACROSS } from './compass.ts';
import { overlayHeld, overlayShut } from './mouse-guards.ts';

export interface JourneyMouse {
  stage: (id: string) => void;
  tabLabel: (tab: JourneyTab) => void;
  paneChildren: () => void;
  artifactRow: (at: number) => void;
  audienceSide: (side: Audience) => void;
  canvasWheel: (direction: WheelDirection) => void;
}

export function journeyMouseOf(deps: PressDeps): JourneyMouse {
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

  const artifactRow = (at: number): void => {
    if (!overlayShut(deps)) {
      deps.stack.pickAt(at);
    }
  };

  const audienceSide = (side: Audience): void => {
    if (overlayShut(deps)) {
      return;
    }

    if (deps.stack.top.kind === 'surface') {
      deps.stack.tune(side);

      return;
    }

    deps.stack.readAs(side);
  };

  const canvasWheel = (direction: WheelDirection): void => {
    const top = deps.stack.top;

    if (overlayHeld(deps) || top.kind !== 'journey') {
      return;
    }

    deps.stack.aim(neighborOf(placedOf(top.journey).nodes, top.sel, ACROSS[direction]));
  };

  return { stage, tabLabel, paneChildren, artifactRow, audienceSide, canvasWheel };
}
