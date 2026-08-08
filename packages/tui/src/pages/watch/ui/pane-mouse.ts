import type { MouseEvent } from '@opentui/core';

import type { WatchMouse } from '../model/mouse.ts';

export function groundedOn(mouse: WatchMouse): (pressed: MouseEvent) => void {
  return (pressed) => {
    pressed.stopPropagation();
    mouse.heldGround();
  };
}

export function wheeledThrough(
  wheel: (direction: 'up' | 'down' | 'left' | 'right') => void,
): (rolled: MouseEvent) => void {
  return (rolled) => {
    const direction = rolled.scroll?.direction;

    if (direction !== undefined) {
      wheel(direction);
    }
  };
}

export function pressedRow(onPress: () => void): (pressed: MouseEvent) => void {
  return (pressed) => {
    pressed.stopPropagation();
    onPress();
  };
}
