import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import type { Draft } from './edit.ts';

import { erased, inserted, moved, split } from './edit.ts';

type Turn =
  | { op: 'insert'; text: string }
  | { op: 'erase' }
  | { op: 'split' }
  | { op: 'move'; direction: 'up' | 'down' | 'left' | 'right' };

const someLine = fc.string({ maxLength: 6 }).map((line) => line.replaceAll('\n', ' '));

const someTurn: fc.Arbitrary<Turn> = fc.oneof(
  someLine.map((text): Turn => ({ op: 'insert', text })),
  fc.constant<Turn>({ op: 'erase' }),
  fc.constant<Turn>({ op: 'split' }),
  fc
    .constantFrom('up' as const, 'down' as const, 'left' as const, 'right' as const)
    .map((direction): Turn => ({ op: 'move', direction })),
);

function taken(draft: Draft, turn: Turn): Draft {
  if (turn.op === 'insert') {
    return inserted(draft, turn.text);
  }

  if (turn.op === 'erase') {
    return erased(draft);
  }

  return turn.op === 'split' ? split(draft) : moved(draft, turn.direction);
}

function insideItsDraft(draft: Draft): boolean {
  const line = draft.lines[draft.cur.l];

  return (
    draft.lines.length > 0 && line !== undefined && draft.cur.c >= 0 && draft.cur.c <= line.length
  );
}

function staysInside(lines: string[], turns: Turn[]): void {
  let draft: Draft = { lines: lines.length > 0 ? lines : [''], cur: { l: 0, c: 0 } };

  for (const turn of turns) {
    draft = taken(draft, turn);
    expect(insideItsDraft(draft)).toBe(true);
  }
}

describe('the cursor a draft never loses', () => {
  it('stays inside the draft after any sequence of edits', () => {
    fc.assert(
      fc.property(
        fc.array(someLine, { maxLength: 4 }),
        fc.array(someTurn, { maxLength: 30 }),
        staysInside,
      ),
    );
  });
});
