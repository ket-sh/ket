import type { Pressed } from './compass.ts';
import type { Frame } from './frames.ts';
import type { Help } from './help.ts';

export function helpPress(key: Pressed, help: Help): void {
  if (key.name === 'escape' || key.seq === '?') {
    help.close();
  }
}

export function helpOpened(key: Pressed, kind: Frame['kind'], help: Help): boolean {
  if (key.seq !== '?' || kind === 'gate') {
    return false;
  }

  help.open();

  return true;
}
