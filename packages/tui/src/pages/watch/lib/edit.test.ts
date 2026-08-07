import { describe, expect, it } from 'vitest';

import { erased, inserted, moved, split } from './edit.ts';

describe('typing into a draft', () => {
  it('lands the text at the cursor and advances it', () => {
    const grown = inserted({ lines: ['ab'], cur: { l: 0, c: 1 } }, 'XY');

    expect(grown.lines).toStrictEqual(['aXYb']);
    expect(grown.cur).toStrictEqual({ l: 0, c: 3 });
  });
});

describe('erasing from a draft', () => {
  it('removes the character before the cursor', () => {
    const shrunk = erased({ lines: ['aXb'], cur: { l: 0, c: 2 } });

    expect(shrunk.lines).toStrictEqual(['ab']);
    expect(shrunk.cur).toStrictEqual({ l: 0, c: 1 });
  });

  it('joins the line into the one above at a line head', () => {
    const joined = erased({ lines: ['ab', 'cd'], cur: { l: 1, c: 0 } });

    expect(joined.lines).toStrictEqual(['abcd']);
    expect(joined.cur).toStrictEqual({ l: 0, c: 2 });
  });

  it('stays still at the very head of the draft', () => {
    const held = erased({ lines: ['ab'], cur: { l: 0, c: 0 } });

    expect(held.lines).toStrictEqual(['ab']);
    expect(held.cur).toStrictEqual({ l: 0, c: 0 });
  });
});

describe('splitting a draft line', () => {
  it('breaks the line at the cursor and seats the cursor below', () => {
    const broken = split({ lines: ['abcd'], cur: { l: 0, c: 2 } });

    expect(broken.lines).toStrictEqual(['ab', 'cd']);
    expect(broken.cur).toStrictEqual({ l: 1, c: 0 });
  });
});

describe('walking a draft', () => {
  it('clamps the column to the end of a shorter line above', () => {
    const walked = moved({ lines: ['ab', 'wxyz'], cur: { l: 1, c: 4 } }, 'up');

    expect(walked.cur).toStrictEqual({ l: 0, c: 2 });
  });

  it('stops at the top edge of the draft', () => {
    expect(moved({ lines: ['ab'], cur: { l: 0, c: 1 } }, 'up').cur).toStrictEqual({ l: 0, c: 1 });
  });

  it('stops at the head of a line', () => {
    expect(moved({ lines: ['ab'], cur: { l: 0, c: 0 } }, 'left').cur).toStrictEqual({ l: 0, c: 0 });
  });

  it('stops at the end of a line', () => {
    expect(moved({ lines: ['ab'], cur: { l: 0, c: 2 } }, 'right').cur).toStrictEqual({
      l: 0,
      c: 2,
    });
  });

  it('walks down onto the next line', () => {
    expect(moved({ lines: ['ab', 'c'], cur: { l: 0, c: 2 } }, 'down').cur).toStrictEqual({
      l: 1,
      c: 1,
    });
  });
});
