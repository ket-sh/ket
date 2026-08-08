import { describe, expect, it } from 'vitest';

import { clipped, widthOf, wrappedTo } from './text.ts';

const FAMILY = '👩‍👩‍👧‍👦';

describe('the room a string asks a terminal for', () => {
  it('gives a plain latin string one column per letter', () => {
    expect(widthOf('ket')).toBe(3);
  });

  it('gives a full width character the two columns it paints', () => {
    expect(widthOf('日本')).toBe(4);
  });

  it('gives a joined emoji the width of the one cluster it draws', () => {
    expect(widthOf(FAMILY)).toBe(2);
  });

  it('gives an accent written as a combining mark no room of its own', () => {
    expect(widthOf('é')).toBe(1);
  });

  it('gives an empty string no room at all', () => {
    expect(widthOf('')).toBe(0);
  });
});

describe('the string a narrow column keeps', () => {
  it('keeps a string that already fits exactly as written', () => {
    expect(clipped('ket', 8)).toBe('ket');
  });

  it('keeps a string that fills the column to its last cell', () => {
    expect(clipped('ket', 3)).toBe('ket');
  });

  it('ends an overrunning string with an ellipsis inside the column', () => {
    expect(clipped('kettle', 4)).toBe('ket…');
  });

  it('keeps a joined emoji whole when the column still has room for it', () => {
    expect(clipped(`ab${FAMILY}cd`, 5)).toBe(`ab${FAMILY}…`);
  });

  it('drops a joined emoji whole rather than cutting it in half', () => {
    expect(clipped(`ab${FAMILY}cd`, 4)).toBe('ab…');
  });

  it('leaves a column too narrow for one wide character showing only the ellipsis', () => {
    expect(clipped('日本', 1)).toBe('…');
  });

  it('counts a full width character as the two cells it takes', () => {
    expect(clipped('日本語', 4)).toBe('日…');
  });

  it('gives back nothing when the column has no room for even an ellipsis', () => {
    expect(clipped('kettle', 0)).toBe('');
  });
});

describe('the lines a paragraph folds into', () => {
  it('leaves a short line whole and alone', () => {
    expect(wrappedTo('a small item', 20, 3)).toStrictEqual(['a small item']);
  });

  it('breaks between words rather than inside them', () => {
    expect(wrappedTo('a small watched item', 12, 3)).toStrictEqual(['a small', 'watched item']);
  });

  it('breaks a single word too long for the column instead of overflowing', () => {
    expect(wrappedTo('unsplittable', 6, 3)).toStrictEqual(['unspli', 'ttable']);
  });

  it('ends the last line with an ellipsis when the text outruns the line budget', () => {
    expect(wrappedTo('one two three four five six', 9, 2)).toStrictEqual(['one two', 'three fo…']);
  });

  it('folds an empty string into no lines at all', () => {
    expect(wrappedTo('   ', 10, 3)).toStrictEqual([]);
  });
});
