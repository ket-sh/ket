import type { BoardLayout } from './board-layout.ts';
import type { Pressed } from './compass.ts';
import type { Filter } from './filter.ts';
import type { Frame } from './frames.ts';

import { glyphOf } from './compass.ts';

const FILTER_MOVES: Record<string, (filter: Filter) => void> = {
  escape: (filter) => {
    filter.clear();
  },
  return: (filter) => {
    filter.keep();
  },
  enter: (filter) => {
    filter.keep();
  },
  backspace: (filter) => {
    filter.erase();
  },
};

export function filterPress(key: Pressed, filter: Filter): void {
  const move = FILTER_MOVES[key.name];

  if (move !== undefined) {
    move(filter);

    return;
  }

  const glyph = glyphOf(key);

  if (glyph !== undefined) {
    filter.type(glyph);
  }
}

function narrowableAt(kind: Frame['kind'], layout: BoardLayout): boolean {
  if (kind === 'oplog') {
    return true;
  }

  return kind === 'board' && layout !== 'backlog' && layout !== 'archive';
}

export function filterOpened(
  key: Pressed,
  kind: Frame['kind'],
  layout: BoardLayout,
  filter: Filter,
): boolean {
  if (key.seq !== '/' || !narrowableAt(kind, layout)) {
    return false;
  }

  filter.begin();

  return true;
}
