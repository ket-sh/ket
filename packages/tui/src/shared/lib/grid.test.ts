import { describe, expect, it } from 'vitest';

import type { Cell } from './grid.ts';

import { boxAt, gridOf, lerpHex, put, spansOf, writeText } from './grid.ts';

function rowText(grid: Cell[][], y: number): string {
  return (grid[y] ?? []).map((cell) => cell.ch).join('');
}

describe('the merges a line survives', () => {
  it('crosses a horizontal over a vertical into a junction', () => {
    const grid = gridOf(3, 1);

    put(grid, 1, 0, '│');
    put(grid, 1, 0, '─');

    expect(grid[0]?.[1]?.ch).toBe('┼');
  });

  it('joins two corners that meet into a tee', () => {
    const grid = gridOf(1, 1);

    put(grid, 0, 0, '╰');
    put(grid, 0, 0, '╭');

    expect(grid[0]?.[0]?.ch).toBe('├');
  });

  it('lets an arrowhead land on any line', () => {
    const grid = gridOf(1, 1);

    put(grid, 0, 0, '─');
    put(grid, 0, 0, '►');

    expect(grid[0]?.[0]?.ch).toBe('►');
  });

  it('drops a stroke that falls off the grid', () => {
    const grid = gridOf(2, 1);

    put(grid, 5, 0, '─');
    put(grid, 0, 3, '─');

    expect(rowText(grid, 0)).toBe('  ');
  });
});

describe('the text a grid carries', () => {
  it('writes a word where it is told', () => {
    const grid = gridOf(5, 1);

    writeText(grid, 1, 0, 'ket', '#fff');

    expect(rowText(grid, 0)).toBe(' ket ');
    expect(grid[0]?.[1]?.fg).toBe('#fff');
  });

  it('clips a word at the edge instead of wrapping', () => {
    const grid = gridOf(3, 1);

    writeText(grid, 2, 0, 'abc');

    expect(rowText(grid, 0)).toBe('  a');
  });
});

describe('the boxes a grid draws', () => {
  it('draws a rounded frame', () => {
    const grid = gridOf(4, 3);

    boxAt(grid, 0, 0, 4, 3, 'rounded', '#888');

    expect(rowText(grid, 0)).toBe('╭──╮');
    expect(rowText(grid, 1)).toBe('│  │');
    expect(rowText(grid, 2)).toBe('╰──╯');
  });

  it('draws a double frame', () => {
    const grid = gridOf(4, 3);

    boxAt(grid, 0, 0, 4, 3, 'double', '#888');

    expect(rowText(grid, 0)).toBe('╔══╗');
    expect(rowText(grid, 2)).toBe('╚══╝');
  });
});

describe('the spans a row folds into', () => {
  it('folds equal-color neighbors into one span', () => {
    const cells: Cell[] = [
      { ch: 'a', fg: '#111' },
      { ch: 'b', fg: '#111' },
      { ch: 'c', fg: '#222' },
    ];

    expect(spansOf(cells)).toStrictEqual([
      { text: 'ab', fg: '#111', bg: undefined },
      { text: 'c', fg: '#222', bg: undefined },
    ]);
  });
});

describe('the color between two colors', () => {
  it('stays home at zero and arrives at one', () => {
    expect(lerpHex('#102030', '#ffffff', 0)).toBe('#102030');
    expect(lerpHex('#102030', '#ffffff', 1)).toBe('#ffffff');
  });

  it('mixes channel by channel', () => {
    expect(lerpHex('#002244', '#446688', 0.5)).toBe('#224466');
  });
});
