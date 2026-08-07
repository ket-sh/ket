interface Cursor {
  l: number;
  c: number;
}

export interface Draft {
  lines: string[];
  cur: Cursor;
}

type Direction = 'up' | 'down' | 'left' | 'right';

function lineAt(draft: Draft, l: number): string {
  return draft.lines[l] ?? '';
}

export function inserted(draft: Draft, text: string): Draft {
  const line = lineAt(draft, draft.cur.l);
  const lines = [...draft.lines];

  lines[draft.cur.l] = line.slice(0, draft.cur.c) + text + line.slice(draft.cur.c);

  return { lines, cur: { l: draft.cur.l, c: draft.cur.c + text.length } };
}

function joinedUp(draft: Draft): Draft {
  if (draft.cur.l === 0) {
    return draft;
  }

  const above = lineAt(draft, draft.cur.l - 1);
  const lines = [...draft.lines];

  lines.splice(draft.cur.l - 1, 2, above + lineAt(draft, draft.cur.l));

  return { lines, cur: { l: draft.cur.l - 1, c: above.length } };
}

export function erased(draft: Draft): Draft {
  if (draft.cur.c === 0) {
    return joinedUp(draft);
  }

  const line = lineAt(draft, draft.cur.l);
  const lines = [...draft.lines];

  lines[draft.cur.l] = line.slice(0, draft.cur.c - 1) + line.slice(draft.cur.c);

  return { lines, cur: { l: draft.cur.l, c: draft.cur.c - 1 } };
}

export function split(draft: Draft): Draft {
  const line = lineAt(draft, draft.cur.l);
  const lines = [...draft.lines];

  lines.splice(draft.cur.l, 1, line.slice(0, draft.cur.c), line.slice(draft.cur.c));

  return { lines, cur: { l: draft.cur.l + 1, c: 0 } };
}

const STEP: Record<Direction, Cursor> = {
  up: { l: -1, c: 0 },
  down: { l: 1, c: 0 },
  left: { l: 0, c: -1 },
  right: { l: 0, c: 1 },
};

function clamp(value: number, low: number, high: number): number {
  return Math.min(Math.max(value, low), Math.max(low, high));
}

export function moved(draft: Draft, direction: Direction): Draft {
  const step = STEP[direction];
  const l = clamp(draft.cur.l + step.l, 0, draft.lines.length - 1);
  const c = clamp(draft.cur.c + step.c, 0, lineAt(draft, l).length);

  return { lines: draft.lines, cur: { l, c } };
}
