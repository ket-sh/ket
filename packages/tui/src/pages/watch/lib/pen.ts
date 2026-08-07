import type { Ln } from '../../../shared/lib';
import type { CalloutView } from '../../../shared/model';
import type { Theme } from '../../../shared/theme';

import { KANAGAWA } from '../../../shared/theme';

export const SUPERSCRIPT = ['¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];

export function blank(): Ln {
  return [{ text: ' ' }];
}

function chipSpan(piece: string, theme: Theme): Ln[number] {
  return { text: ` ${piece} `, fg: theme.blue, bg: theme.surface1 };
}

function chipsOf(text: string, base: string, theme: Theme): Ln {
  const spans: Ln = [];

  text.split('`').forEach((piece, index) => {
    if (piece === '') {
      return;
    }

    spans.push(index % 2 === 1 ? chipSpan(piece, theme) : { text: piece, fg: base });
  });

  return spans.length === 0 ? blank() : spans;
}

function trimmedEnds(span: Ln[number], at: number, length: number): { lead: Ln; tail: Ln } {
  const rest = span.text.slice(at + length);

  return {
    lead: at > 0 ? [{ ...span, text: span.text.slice(0, at) }] : [],
    tail: rest === '' ? [] : [{ ...span, text: rest }],
  };
}

function claimed(
  span: Ln[number],
  callout: CalloutView,
  order: number,
  theme: Theme,
): Ln | undefined {
  const at = span.bg === undefined ? span.text.indexOf(callout.claim) : -1;

  if (at < 0) {
    return undefined;
  }

  const { lead, tail } = trimmedEnds(span, at, callout.claim.length);

  return [
    ...lead,
    { text: callout.claim, fg: theme.yellow },
    { text: SUPERSCRIPT[order] ?? '¹', fg: theme.yellow },
    ...tail,
  ];
}

function markClaims(line: Ln, callouts: CalloutView[], theme: Theme): Ln {
  let current = line;

  callouts.forEach((callout, order) => {
    current = current.flatMap((span) => claimed(span, callout, order, theme) ?? [span]);
  });

  return current;
}

const BADGE_LINE = /^(Status|Date): (.+)/;

function headed(line: string, theme: Theme): Ln | undefined {
  if (line.startsWith('## ')) {
    return [{ text: line.slice(3), fg: theme.blue }];
  }

  return line.startsWith('# ') ? [{ text: line.slice(2), fg: theme.violet }] : undefined;
}

function badged(line: string, theme: Theme): Ln | undefined {
  const badge = BADGE_LINE.exec(line.trim());

  if (badge === null) {
    return undefined;
  }

  return [
    { text: ` ${badge[1] ?? ''} `, fg: theme.base, bg: theme.overlay },
    { text: ` ${badge[2] ?? ''}`, fg: theme.yellow },
  ];
}

function proseLine(line: string, callouts: CalloutView[], theme: Theme): Ln {
  if (line === '') {
    return blank();
  }

  const special = badged(line, theme) ?? headed(line, theme);

  if (special !== undefined) {
    return special;
  }

  if (line.startsWith('- ')) {
    return markClaims(
      [{ text: '• ', fg: theme.overlay }, ...chipsOf(line.slice(2), theme.subtext, theme)],
      callouts,
      theme,
    );
  }

  return markClaims(chipsOf(line, theme.text, theme), callouts, theme);
}

export function proseLn(
  source: string,
  callouts: CalloutView[] = [],
  theme: Theme = KANAGAWA,
): Ln[] {
  return source.split('\n').map((line) => proseLine(line, callouts, theme));
}
