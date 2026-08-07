import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import type { Cell } from './grid.ts';

import { gridOf, put, spansOf } from './grid.ts';

const LINE_STROKES = ['─', '│', '╮', '╯', '╭', '╰', '├', '┤', '┬', '┴', '┼'];

const someCell = fc.record({
  ch: fc.constantFrom('a', 'b', ' ', '─'),
  fg: fc.option(fc.constantFrom('#111', '#222'), { nil: undefined }),
});

function foldedText(cells: Cell[]): string {
  return spansOf(cells)
    .map((span) => span.text)
    .join('');
}

function rowChars(cells: Cell[]): string {
  return cells.map((cell) => cell.ch).join('');
}

function struck(first: string, second: string): string {
  const grid = gridOf(1, 1);

  put(grid, 0, 0, first);
  put(grid, 0, 0, second);

  return grid[0]?.[0]?.ch ?? ' ';
}

describe('the invariants the grid keeps', () => {
  it('merges two line strokes the same whichever lands first', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...LINE_STROKES),
        fc.constantFrom(...LINE_STROKES),
        (first, second) => {
          expect(struck(first, second)).toBe(struck(second, first));
        },
      ),
    );
  });

  it('keeps every character through the span fold', () => {
    fc.assert(
      fc.property(fc.array(someCell, { maxLength: 30 }), (cells: Cell[]) => {
        expect(foldedText(cells)).toBe(rowChars(cells));
      }),
    );
  });
});
