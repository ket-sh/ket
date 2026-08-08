import type { Pressed } from '../model/compass.ts';

import { widthOf } from '../../../shared/lib';

const SEPARATOR = ' · ';

export function rowOf(hints: string[]): string {
  return hints.join(SEPARATOR);
}

// The way out is the one hint the row can never lose, so a narrow terminal
// gives up the hints behind it instead, least useful first.
export function keptAt(hints: string[], room: number): number[] {
  const out = hints.length - 1;
  let kept = hints.map((_, at) => at);

  while (kept.length > 1 && widthOf(rowOf(kept.map((at) => hints[at] ?? ''))) > room) {
    kept = [...kept.slice(0, kept.length - 2), out];
  }

  return kept;
}

export function hintIndexAt(hints: string[], column: number): number | undefined {
  let start = 0;

  for (const [at, hint] of hints.entries()) {
    const end = start + widthOf(hint);

    if (column >= start && column < end) {
      return at;
    }

    start = end + widthOf(SEPARATOR);
  }

  return undefined;
}

const NAMED: Record<string, Pressed> = {
  '⏎': { name: 'return', seq: '\r', ctrl: false },
  esc: { name: 'escape', seq: '\u001b', ctrl: false },
  '←': { name: 'left', seq: '', ctrl: false },
  '→': { name: 'right', seq: '', ctrl: false },
  '↑': { name: 'up', seq: '', ctrl: false },
  '↓': { name: 'down', seq: '', ctrl: false },
};

function isOneGlyph(keys: string): boolean {
  return [...new Intl.Segmenter().segment(keys)].length === 1;
}

const CHORD = 'ctrl+';

export function pressedOf(keys: string): Pressed | undefined {
  const named = NAMED[keys];

  if (named !== undefined) {
    return named;
  }

  if (keys.startsWith(CHORD) && isOneGlyph(keys.slice(CHORD.length))) {
    return { name: keys.slice(CHORD.length), seq: '', ctrl: true };
  }

  return isOneGlyph(keys) ? { name: keys, seq: keys, ctrl: false } : undefined;
}
