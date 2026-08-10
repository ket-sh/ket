import { describe, expect, it } from 'vitest';

import { shelfStepped } from './backlog-walk.ts';

describe('the step that carries the backlog cursor onto the unfiled shelf', () => {
  it('hands the cursor to the shelf where the filed rows have run out', () => {
    expect(shelfStepped({ at: undefined, rows: 2, filedLeft: 0 }, 1)).toStrictEqual({
      at: 0,
      took: true,
    });
  });

  it('leaves the filed rows walking while more of them sit below the cursor', () => {
    expect(shelfStepped({ at: undefined, rows: 2, filedLeft: 1 }, 1)).toStrictEqual({
      at: undefined,
      took: false,
    });
  });

  it('leaves the filed rows walking on the way up', () => {
    expect(shelfStepped({ at: undefined, rows: 2, filedLeft: 0 }, -1)).toStrictEqual({
      at: undefined,
      took: false,
    });
  });

  it('keeps the filed rows walking where the map leaves nothing unfiled', () => {
    expect(shelfStepped({ at: undefined, rows: 0, filedLeft: 0 }, 1)).toStrictEqual({
      at: undefined,
      took: false,
    });
  });
});

describe('the step the unfiled shelf takes once it holds the cursor', () => {
  it('walks down its rows', () => {
    expect(shelfStepped({ at: 0, rows: 3, filedLeft: 0 }, 1)).toStrictEqual({ at: 1, took: true });
  });

  it('holds its last row rather than walking past it', () => {
    expect(shelfStepped({ at: 2, rows: 3, filedLeft: 0 }, 1)).toStrictEqual({ at: 2, took: true });
  });

  it('hands the cursor back to the filed rows from its first row', () => {
    expect(shelfStepped({ at: 0, rows: 3, filedLeft: 0 }, -1)).toStrictEqual({
      at: undefined,
      took: true,
    });
  });

  it('gives the cursor up where the last unfiled story has just been filed', () => {
    expect(shelfStepped({ at: 2, rows: 0, filedLeft: 0 }, 1)).toStrictEqual({
      at: undefined,
      took: false,
    });
  });
});
