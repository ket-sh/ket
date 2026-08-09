import { SyntaxStyle } from '@opentui/core';

import type { Theme } from './themes.ts';

function wovenOf(theme: Theme): SyntaxStyle {
  return SyntaxStyle.fromStyles({
    default: { fg: theme.text },
    conceal: { fg: theme.overlay },
    'markup.heading': { fg: theme.blue, bold: true },
    'markup.strong': { fg: theme.text, bold: true },
    'markup.italic': { fg: theme.text, italic: true },
    'markup.raw': { fg: theme.aqua },
    'markup.quote': { fg: theme.subtext, italic: true },
    'markup.list': { fg: theme.subtext },
    'markup.link': { fg: theme.blue2, underline: true },
    'markup.link.label': { fg: theme.blue2 },
    'markup.link.url': { fg: theme.blue2, underline: true },
    'markup.strikethrough': { fg: theme.overlay, dim: true },
  });
}

const WOVEN = new WeakMap<Theme, SyntaxStyle>();

export function markdownStyleOf(theme: Theme): SyntaxStyle {
  const held = WOVEN.get(theme);

  if (held !== undefined) {
    return held;
  }

  const woven = wovenOf(theme);

  WOVEN.set(theme, woven);

  return woven;
}
