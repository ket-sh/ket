import type { Pressed } from './compass.ts';
import type { Frame } from './frames.ts';
import type { Palette } from './palette.ts';

import { glyphOf } from './compass.ts';

const PALETTE_MOVES: Record<string, (palette: Palette) => void> = {
  escape: (palette) => {
    palette.close();
  },
  return: (palette) => {
    palette.choose();
  },
  enter: (palette) => {
    palette.choose();
  },
  backspace: (palette) => {
    palette.erase();
  },
  up: (palette) => {
    palette.move(-1);
  },
  down: (palette) => {
    palette.move(1);
  },
};

export function palettePress(key: Pressed, palette: Palette): void {
  const move = PALETTE_MOVES[key.name];

  if (move !== undefined) {
    move(palette);

    return;
  }

  const glyph = glyphOf(key);

  if (glyph !== undefined) {
    palette.type(glyph);
  }
}

export function paletteOpened(key: Pressed, kind: Frame['kind'], palette: Palette): boolean {
  if (!key.ctrl || key.name !== 'p' || kind === 'gate') {
    return false;
  }

  palette.begin();

  return true;
}
