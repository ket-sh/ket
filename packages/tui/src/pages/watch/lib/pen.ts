import type { Ln } from '../../../shared/lib';
import type { CalloutView } from '../../../shared/model';

import {
  BASE,
  BLUE,
  OVERLAY,
  SUBTEXT,
  SURFACE1,
  TEXT,
  VIOLET,
  YELLOW,
} from '../../../shared/theme';

export const SUPERSCRIPT = ['¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];

export function blank(): Ln {
  return [{ text: ' ' }];
}

function chipSpan(piece: string): Ln[number] {
  return { text: ` ${piece} `, fg: BLUE, bg: SURFACE1 };
}

function chipsOf(text: string, base: string): Ln {
  const spans: Ln = [];

  text.split('`').forEach((piece, index) => {
    if (piece === '') {
      return;
    }

    spans.push(index % 2 === 1 ? chipSpan(piece) : { text: piece, fg: base });
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

function claimed(span: Ln[number], callout: CalloutView, order: number): Ln | undefined {
  const at = span.bg === undefined ? span.text.indexOf(callout.claim) : -1;

  if (at < 0) {
    return undefined;
  }

  const { lead, tail } = trimmedEnds(span, at, callout.claim.length);

  return [
    ...lead,
    { text: callout.claim, fg: YELLOW },
    { text: SUPERSCRIPT[order] ?? '¹', fg: YELLOW },
    ...tail,
  ];
}

function markClaims(line: Ln, callouts: CalloutView[]): Ln {
  let current = line;

  callouts.forEach((callout, order) => {
    current = current.flatMap((span) => claimed(span, callout, order) ?? [span]);
  });

  return current;
}

const BADGE_LINE = /^(Status|Date): (.+)/;

function headed(line: string): Ln | undefined {
  if (line.startsWith('## ')) {
    return [{ text: line.slice(3), fg: BLUE }];
  }

  return line.startsWith('# ') ? [{ text: line.slice(2), fg: VIOLET }] : undefined;
}

function badged(line: string): Ln | undefined {
  const badge = BADGE_LINE.exec(line.trim());

  if (badge === null) {
    return undefined;
  }

  return [
    { text: ` ${badge[1] ?? ''} `, fg: BASE, bg: OVERLAY },
    { text: ` ${badge[2] ?? ''}`, fg: YELLOW },
  ];
}

function proseLine(line: string, callouts: CalloutView[]): Ln {
  if (line === '') {
    return blank();
  }

  const special = badged(line) ?? headed(line);

  if (special !== undefined) {
    return special;
  }

  if (line.startsWith('- ')) {
    return markClaims([{ text: '• ', fg: OVERLAY }, ...chipsOf(line.slice(2), SUBTEXT)], callouts);
  }

  return markClaims(chipsOf(line, TEXT), callouts);
}

export function proseLn(source: string, callouts: CalloutView[] = []): Ln[] {
  return source.split('\n').map((line) => proseLine(line, callouts));
}
