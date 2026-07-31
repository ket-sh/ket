import { describe, expect, it } from 'vitest';

import { boxed } from './table.ts';

const ANSI = new RegExp(`${String.fromCharCode(27)}\\[\\d+m`, 'gu');

function linesOf(drawn: string): string[] {
  return drawn.split('\n').map((line) => line.replaceAll(ANSI, ''));
}

describe('a box the outro can print', () => {
  it('writes the headings above the rows', () => {
    const drawn = linesOf(boxed(['runner', 'purpose'], [['alpha', 'beta']], 'legend'));
    const heading = drawn.findIndex((line) => line.includes('runner'));
    const row = drawn.findIndex((line) => line.includes('alpha'));

    expect(heading).toBeLessThan(row);
  });

  it('writes every row it was given', () => {
    const drawn = linesOf(boxed(['runner'], [['first'], ['second']], 'legend')).join('\n');

    expect(drawn).toContain('first');
    expect(drawn).toContain('second');
  });

  it('closes with the footer, below every row', () => {
    const drawn = linesOf(boxed(['runner'], [['only']], 'the footer'));
    const row = drawn.findIndex((line) => line.includes('only'));
    const footer = drawn.findIndex((line) => line.includes('the footer'));

    expect(footer).toBeGreaterThan(row);
  });

  it('runs the footer across every column, so it reads as one line', () => {
    const drawn = linesOf(boxed(['one', 'two', 'three'], [['x1', 'x2', 'x3']], 'across'));
    const footer = drawn.find((line) => line.includes('across')) ?? '';

    expect(footer.split('│').filter((piece) => piece.trim() !== '')).toHaveLength(1);
  });

  it('indents every line, so the box sits under the outro rather than beside it', () => {
    for (const line of linesOf(boxed(['runner'], [['alpha']], 'legend'))) {
      expect({ line, indented: line.startsWith('   ') }).toStrictEqual({ line, indented: true });
    }
  });

  it('draws a rounded corner at each end of the top', () => {
    const [top = ''] = linesOf(boxed(['runner'], [['alpha']], 'legend'));

    expect(top.trimStart().startsWith('╭') && top.endsWith('╮')).toBe(true);
  });

  it('rules between the headings and the rows, and again above the footer', () => {
    const drawn = linesOf(boxed(['runner'], [['alpha']], 'legend'));

    expect(drawn.filter((line) => line.includes('├')).length).toBe(2);
  });
});
