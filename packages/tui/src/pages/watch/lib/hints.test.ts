import { describe, expect, it } from 'vitest';

import { hintIndexAt, keptAt, pressedOf, rowOf } from './hints.ts';

describe('the hints a narrow row keeps', () => {
  it('keeps every hint in order when the room holds them all', () => {
    expect(keptAt(['←↑↓→ move', '⏎ journey', 'q quit'], 80)).toStrictEqual([0, 1, 2]);
  });

  it('gives up the hint before the way out first', () => {
    expect(keptAt(['aa', 'bb', 'cc', 'dd'], 14)).toStrictEqual([0, 1, 3]);
  });

  it('leaves only the way out when the room starves', () => {
    expect(keptAt(['aa', 'bb', 'cc', 'dd'], 3)).toStrictEqual([3]);
  });

  it('keeps the lone hint whatever the room', () => {
    expect(keptAt(['q quit'], 0)).toStrictEqual([0]);
  });
});

describe('the row the kept hints spell', () => {
  it('threads the hints on the separator the key bar draws', () => {
    expect(rowOf(['b backlog', 'q quit'])).toBe('b backlog · q quit');
  });
});

describe('the hint a clicked column lands on', () => {
  it('resolves a column inside the first hint', () => {
    expect(hintIndexAt(['b backlog', 'q quit'], 0)).toBe(0);
    expect(hintIndexAt(['b backlog', 'q quit'], 8)).toBe(0);
  });

  it('resolves a column inside a later hint', () => {
    expect(hintIndexAt(['b backlog', 'q quit'], 12)).toBe(1);
    expect(hintIndexAt(['b backlog', 'q quit'], 17)).toBe(1);
  });

  it('lands nowhere on the separator between hints', () => {
    expect(hintIndexAt(['b backlog', 'q quit'], 9)).toBeUndefined();
    expect(hintIndexAt(['b backlog', 'q quit'], 10)).toBeUndefined();
    expect(hintIndexAt(['b backlog', 'q quit'], 11)).toBeUndefined();
  });

  it('lands nowhere past the row', () => {
    expect(hintIndexAt(['b backlog', 'q quit'], 18)).toBeUndefined();
    expect(hintIndexAt(['b backlog', 'q quit'], -1)).toBeUndefined();
  });
});

describe('the press a hint key stands for', () => {
  it('presses the letter a single-glyph hint names', () => {
    expect(pressedOf('q')).toStrictEqual({ name: 'q', seq: 'q', ctrl: false });
    expect(pressedOf('/')).toStrictEqual({ name: '/', seq: '/', ctrl: false });
    expect(pressedOf('?')).toStrictEqual({ name: '?', seq: '?', ctrl: false });
  });

  it('presses return for the enter glyph', () => {
    expect(pressedOf('⏎')).toStrictEqual({ name: 'return', seq: '\r', ctrl: false });
  });

  it('presses escape for esc', () => {
    expect(pressedOf('esc')).toStrictEqual({ name: 'escape', seq: '\u001b', ctrl: false });
  });

  it('presses the named arrow for an arrow glyph', () => {
    expect(pressedOf('←')).toStrictEqual({ name: 'left', seq: '', ctrl: false });
    expect(pressedOf('→')).toStrictEqual({ name: 'right', seq: '', ctrl: false });
  });

  it('holds ctrl for a chorded hint', () => {
    expect(pressedOf('ctrl+p')).toStrictEqual({ name: 'p', seq: '', ctrl: true });
    expect(pressedOf('ctrl+s')).toStrictEqual({ name: 's', seq: '', ctrl: true });
  });

  it('stands for no press where the hint spans several keys', () => {
    expect(pressedOf('←↑↓→')).toBeUndefined();
    expect(pressedOf('↑↓')).toBeUndefined();
    expect(pressedOf('tab ←→')).toBeUndefined();
    expect(pressedOf('type')).toBeUndefined();
  });
});
