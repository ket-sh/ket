import type { Pressed, WheelDirection } from './compass.ts';
import type { JourneyMouse } from './journey-mouse.ts';
import type { PressDeps } from './keys.ts';

import { catalogRows } from '../lib/docs.ts';
import { seatedRow } from '../lib/oplog.ts';
import { ACROSS } from './compass.ts';
import { journeyMouseOf } from './journey-mouse.ts';
import { press, shownLogOf } from './keys.ts';
import { overlayHeld, overlayShut } from './mouse-guards.ts';

interface BoardMouse {
  boardCard: (key: string) => void;
  laneHead: (key: string | undefined) => void;
  boardWheel: (direction: WheelDirection) => void;
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

  const boardWheel = (direction: WheelDirection): void => {
    if (overlayHeld(deps) || deps.stack.top.kind !== 'board') {
      return;
    }

    deps.seat.move({ col: ACROSS[direction] === 'left' ? -1 : 1, row: 0 });
  };

  const hint = (pressed: Pressed): void => {
    press(pressed, deps);
  };

  return { boardCard, laneHead, boardWheel, hint };
}

const WHEEL_SLIDE: Record<WheelDirection, number> = {
  up: -1,
  down: 1,
  left: 0,
  right: 0,
};

interface RowsMouse {
  backlogRow: (key: string) => void;
  listRow: (key: string) => void;
  listWheel: (direction: WheelDirection) => void;
}

function rowsMouseOf(deps: PressDeps): RowsMouse {
  const backlogRow = (key: string): void => {
    if (overlayShut(deps) || deps.stack.top.kind !== 'board') {
      return;
    }

    deps.seat.seek(key);
    deps.stack.dive(key);
  };

  const listRow = (key: string): void => {
    if (overlayShut(deps) || deps.stack.top.kind !== 'board') {
      return;
    }

    deps.seat.seek(key);
  };

  const listWheel = (direction: WheelDirection): void => {
    const step = WHEEL_SLIDE[direction];

    if (overlayHeld(deps) || deps.stack.top.kind !== 'board' || step === 0) {
      return;
    }

    deps.seat.slide(step);
  };

  return { backlogRow, listRow, listWheel };
}

interface LogMouse {
  logRow: (at: number) => void;
  logWheel: (direction: WheelDirection) => void;
}

function logMouseOf(deps: PressDeps): LogMouse {
  const logRow = (at: number): void => {
    if (overlayShut(deps) || deps.stack.top.kind !== 'oplog') {
      return;
    }

    const shown = shownLogOf(deps);

    if (seatedRow(deps.stack.top.sel, shown.length) === at) {
      deps.stack.dive(shown[at]?.item);

      return;
    }

    deps.stack.logSeat(at);
  };

  const logWheel = (direction: WheelDirection): void => {
    const step = WHEEL_SLIDE[direction];

    if (overlayHeld(deps) || deps.stack.top.kind !== 'oplog' || step === 0) {
      return;
    }

    deps.stack.logSlide(step, shownLogOf(deps).length - 1);
  };

  return { logRow, logWheel };
}

interface DocsMouse {
  docsRow: (at: number) => void;
  docsWheel: (direction: WheelDirection) => void;
}

function docsMouseOf(deps: PressDeps): DocsMouse {
  const docsRow = (at: number): void => {
    if (overlayShut(deps) || deps.stack.top.kind !== 'docs') {
      return;
    }

    const rows = catalogRows(deps.stack.top.catalog);

    if (seatedRow(deps.stack.top.sel, rows.length) === at) {
      deps.stack.docsFocus('detail');

      return;
    }

    deps.stack.docsSeat(at);
  };

  const docsWheel = (direction: WheelDirection): void => {
    const step = WHEEL_SLIDE[direction];
    const top = deps.stack.top;

    if (overlayHeld(deps) || top.kind !== 'docs' || step === 0) {
      return;
    }

    deps.stack.docsSlide(step, catalogRows(top.catalog).length - 1);
  };

  return { docsRow, docsWheel };
}

interface MapMouse {
  mapSeat: (at: number) => void;
  mapWheel: (direction: WheelDirection) => void;
}

function mapMouseOf(deps: PressDeps): MapMouse {
  const mapSeat = (at: number): void => {
    if (!overlayShut(deps)) {
      deps.stack.mapSeat(at);
    }
  };

  const mapWheel = (direction: WheelDirection): void => {
    if (!overlayHeld(deps)) {
      deps.stack.mapWalk(direction);
    }
  };

  return { mapSeat, mapWheel };
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

export interface WatchMouse
  extends BoardMouse, RowsMouse, JourneyMouse, LogMouse, DocsMouse, MapMouse, OverlayMouse {}

export function mouseOf(deps: PressDeps): WatchMouse {
  return {
    ...boardMouseOf(deps),
    ...rowsMouseOf(deps),
    ...journeyMouseOf(deps),
    ...logMouseOf(deps),
    ...docsMouseOf(deps),
    ...mapMouseOf(deps),
    ...overlayMouseOf(deps),
  };
}
