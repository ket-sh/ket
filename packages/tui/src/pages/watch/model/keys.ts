import type { OplogEventView } from '../../../shared/model';
import type { Pressed } from './compass.ts';
import type { Filter } from './filter.ts';
import type { Frame, FrameStack } from './frames.ts';
import type { PressDeps } from './press-deps.ts';

import { catalogRows } from '../lib/docs.ts';
import { narrowedEvents } from '../lib/oplog.ts';
import { boardPress } from './board-keys.ts';
import { docsPress } from './docs-keys.ts';
import { editorPress } from './editor-keys.ts';
import { filterOpened, filterPress } from './filter-keys.ts';
import { ceremonyPress, journeyPress, mapPress, surfacePress } from './frame-keys.ts';
import { GATE_KEYS } from './gate-keys.ts';
import { helpOpened, helpPress } from './help-keys.ts';
import { oplogPress } from './oplog-keys.ts';
import { paletteOpened, palettePress } from './palette-keys.ts';
import { pickerPress } from './picker-keys.ts';

export function narrowerOf(deps: PressDeps): Filter {
  return deps.stack.top.kind === 'oplog' ? deps.logFilter : deps.filter;
}

export function shownLogOf(deps: PressDeps): OplogEventView[] {
  return deps.stack.top.kind === 'oplog'
    ? narrowedEvents(deps.stack.top.events, deps.logFilter.query)
    : [];
}

function journeyGateOpened(name: string, stack: FrameStack, tick: number): boolean {
  const top = stack.top;

  if (top.kind !== 'journey') {
    return false;
  }

  const action = GATE_KEYS[name];

  if (action === undefined || !top.journey.pane.offers.includes(action)) {
    return false;
  }

  stack.gate(action, { key: top.journey.item, title: top.journey.title }, tick);

  return true;
}

const FRAME_PRESSES: Record<Frame['kind'], (name: string, deps: PressDeps) => void> = {
  board: (name, deps) => {
    boardPress(name, deps);
  },
  journey: (name, deps) => {
    if (journeyGateOpened(name, deps.stack, deps.tick)) {
      return;
    }

    journeyPress(name, deps.stack);
  },
  map: (name, deps) => {
    mapPress(name, deps.stack);
  },
  oplog: (name, deps) => {
    oplogPress(name, deps.stack, shownLogOf(deps));
  },
  docs: (name, deps) => {
    const top = deps.stack.top;
    const most = top.kind === 'docs' ? catalogRows(top.catalog).length - 1 : 0;

    docsPress(name, deps.stack, most);
  },
  surface: (name, deps) => {
    surfacePress(name, deps.stack, deps.most);
  },
  gate: (name, deps) => {
    ceremonyPress(name, deps.stack, deps.tick);
  },
  edit: () => undefined,
};

function overlayPress(key: Pressed, deps: PressDeps): boolean {
  if (deps.palette.at !== undefined) {
    palettePress(key, deps.palette);

    return true;
  }

  if (deps.picker.at !== undefined) {
    pickerPress(key.name, deps.picker);

    return true;
  }

  if (deps.help.on) {
    helpPress(key, deps.help);

    return true;
  }

  return false;
}

function heldPress(key: Pressed, deps: PressDeps): boolean {
  if (overlayPress(key, deps)) {
    return true;
  }

  if (deps.stack.top.kind === 'edit') {
    editorPress(key, deps.stack, deps.tick);

    return true;
  }

  const narrower = narrowerOf(deps);

  if (narrower.typing) {
    filterPress(key, narrower);

    return true;
  }

  return false;
}

const GLOBAL_KEYS: Record<string, (deps: PressDeps) => void> = {
  q: (deps) => {
    deps.onQuit();
  },
  r: (deps) => {
    deps.refresh();
  },
  t: (deps) => {
    deps.picker.open();
  },
};

function overlayOpened(key: Pressed, deps: PressDeps): boolean {
  const kind = deps.stack.top.kind;

  return (
    filterOpened(key, kind, deps.layout, narrowerOf(deps)) ||
    paletteOpened(key, kind, deps.palette) ||
    helpOpened(key, kind, deps.help)
  );
}

export function press(key: Pressed, deps: PressDeps): void {
  if (heldPress(key, deps)) {
    return;
  }

  const answered = GLOBAL_KEYS[key.name];

  if (answered !== undefined) {
    answered(deps);

    return;
  }

  if (overlayOpened(key, deps)) {
    return;
  }

  FRAME_PRESSES[deps.stack.top.kind](key.name, deps);
}
