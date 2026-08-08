import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { clipped, widthOf, wrappedTo } from './text.ts';

const ANY_TEXT = fc.string({ unit: 'grapheme', maxLength: 40 });

const ANY_ROOM = fc.integer({ min: 0, max: 30 });

describe('what clipping promises whatever it is handed', () => {
  it('never paints past the column it was given', () => {
    fc.assert(
      fc.property(ANY_TEXT, ANY_ROOM, (text, room) => {
        expect(widthOf(clipped(text, room))).toBeLessThanOrEqual(room);
      }),
    );
  });

  it('leaves a string that already fits untouched', () => {
    fc.assert(
      fc.property(ANY_TEXT, ANY_ROOM, (text, room) => {
        fc.pre(widthOf(text) <= room);
        expect(clipped(text, room)).toBe(text);
      }),
    );
  });
});

describe('what wrapping promises whatever it is handed', () => {
  it('never paints a line past the column it was given', () => {
    fc.assert(
      fc.property(
        ANY_TEXT,
        fc.integer({ min: 1, max: 30 }),
        fc.integer({ min: 1, max: 5 }),
        (text, room, most) => {
          for (const line of wrappedTo(text, room, most)) {
            expect(widthOf(line)).toBeLessThanOrEqual(room);
          }
        },
      ),
    );
  });

  it('never folds into more lines than it was allowed', () => {
    fc.assert(
      fc.property(
        ANY_TEXT,
        fc.integer({ min: 1, max: 30 }),
        fc.integer({ min: 1, max: 5 }),
        (text, room, most) => {
          expect(wrappedTo(text, room, most).length).toBeLessThanOrEqual(most);
        },
      ),
    );
  });
});
