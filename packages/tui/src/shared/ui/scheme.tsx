import type { ThemeMode } from '@opentui/core';
import type { ReactNode } from 'react';

import { useRenderer } from '@opentui/react';
import { useLayoutEffect } from 'react';

import { useTheme } from '../theme';

export function Scheme(): ReactNode {
  const { rest } = useTheme();
  const renderer = useRenderer();

  useLayoutEffect(() => {
    const heard = (mode: ThemeMode): void => {
      rest(mode);
    };

    rest(renderer.themeMode);
    renderer.on('theme_mode', heard);

    return () => {
      renderer.off('theme_mode', heard);
    };
  }, [renderer, rest]);

  return null;
}
