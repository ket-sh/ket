import type { Theme } from '../theme/themes.ts';

import { KANAGAWA } from '../theme/themes.ts';
import { lerpHex } from './grid.ts';

function bandOf(theme: Theme): string[] {
  return [
    theme.violet,
    theme.blue2,
    theme.blue,
    theme.aqua,
    theme.green,
    theme.aqua,
    theme.blue,
    theme.blue2,
  ];
}

export function bandAt(unit: number, theme: Theme = KANAGAWA): string {
  const band = bandOf(theme);
  const wrapped = ((unit % 1) + 1) % 1;
  const scaled = wrapped * band.length;
  const index = Math.floor(scaled) % band.length;
  const next = (index + 1) % band.length;

  return lerpHex(band[index] ?? theme.violet, band[next] ?? theme.violet, scaled - index);
}
