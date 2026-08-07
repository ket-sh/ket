import type { Theme } from './tokens.ts';

import { DARK, KANAGAWA } from './dark.ts';
import { LIGHT } from './light.ts';

export type { Theme } from './tokens.ts';

export { KANAGAWA };

export const THEMES: [string, Theme][] = [...DARK, ...LIGHT];

export function stageColorOf(theme: Theme): Record<string, string> {
  return {
    idea: theme.gray,
    triaged: theme.blue,
    designing: theme.violet,
    'awaiting-approval': theme.yellow,
    implementing: theme.orange,
    verifying: theme.aqua,
    'awaiting-merge': theme.violet2,
    shipped: theme.green,
  };
}
