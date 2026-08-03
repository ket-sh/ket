import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { paintedTorii, toriiBeside } from './banner.ts';

const ESCAPE = String.fromCharCode(27);

const ANSI_CODE = new RegExp(`${ESCAPE}\\[[\\d;]+m`, 'gu');

function bare(line: string): string {
  return line.replaceAll(ANSI_CODE, '');
}

describe('sitting arbitrary text beside the torii gate', () => {
  it('always draws nine rows, and never lets the text reach the roof, the neck, or the ground', () => {
    fc.assert(
      fc.property(fc.array(fc.string()), (text) => {
        const beside = toriiBeside(text);
        const art = paintedTorii();

        expect(beside).toHaveLength(9);
        expect(beside[0]).toBe(art[0]);
        expect(beside[1]).toBe(art[1]);
        expect(beside[2]).toBe(art[2]);
        expect(beside[8]).toBe(art[8]);
      }),
    );
  });

  it('pads the gate body to exactly 25 plain columns before the gap opens, whatever the text', () => {
    fc.assert(
      fc.property(fc.array(fc.string()), (text) => {
        const beside = toriiBeside(text);

        for (const index of [3, 4, 5, 6, 7]) {
          const row = beside[index] ?? '';
          const line = text[index - 3] ?? '';
          const artPortion = row.slice(0, row.length - 3 - line.length);

          expect(bare(artPortion)).toHaveLength(25);
        }
      }),
    );
  });
});
