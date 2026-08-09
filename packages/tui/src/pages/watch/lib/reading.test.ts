import { describe, expect, it } from 'vitest';

import { readShiftOf } from './reading.ts';

describe('the window a reading cursor drags', () => {
  it('holds the top while the cursor sits in the upper half', () => {
    expect(readShiftOf(0, 42, 12)).toBe(0);
    expect(readShiftOf(5, 42, 12)).toBe(0);
  });

  it('centers the cursor once it passes the middle', () => {
    expect(readShiftOf(20, 42, 12)).toBe(14);
  });

  it('clamps at the tail rather than sliding past it', () => {
    expect(readShiftOf(41, 42, 12)).toBe(30);
  });

  it('stays put where the whole doc fits the window', () => {
    expect(readShiftOf(5, 8, 12)).toBe(0);
  });
});
