import type { ThemeMode } from '@opentui/core';

import { DARK } from './dark.ts';

export function restingOf(mode: ThemeMode | null): number {
  return mode === 'light' ? DARK.length : 0;
}
