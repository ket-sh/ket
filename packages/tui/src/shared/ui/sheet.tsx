import type { ReactNode } from 'react';

import { useRenderer } from '@opentui/react';
import { useLayoutEffect } from 'react';

import { useTheme } from '../theme';

export function Sheet(): ReactNode {
  const { theme } = useTheme();
  const renderer = useRenderer();

  useLayoutEffect(() => {
    renderer.setBackgroundColor(theme.base);
  }, [renderer, theme.base]);

  return null;
}
