import { useState } from 'react';

import type { FrameStack } from './frames.ts';

import { THEMES, useTheme } from '../../../shared/theme';

export interface Picker {
  at: number | undefined;
  open: () => void;
  move: (delta: number) => void;
  keep: () => void;
  close: () => void;
}

export function usePicker(stack: FrameStack): Picker {
  const wardrobe = useTheme();
  const [at, setAt] = useState<number | undefined>(undefined);

  const open = (): void => {
    if (stack.top.kind !== 'gate') {
      setAt(THEMES.findIndex(([name]) => name === wardrobe.name));
    }
  };

  const move = (delta: number): void => {
    const landing = Math.min(Math.max((at ?? 0) + delta, 0), THEMES.length - 1);

    setAt(landing);
    wardrobe.preview(landing);
  };

  const keep = (): void => {
    if (at !== undefined) {
      wardrobe.keep(at);
    }

    setAt(undefined);
  };

  const close = (): void => {
    wardrobe.revert();
    setAt(undefined);
  };

  return { at, open, move, keep, close };
}
