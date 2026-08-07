import { describe, expect, it } from 'vitest';

import { confettiRows } from './confetti.ts';

function textOf(rows: ReturnType<typeof confettiRows>): string[] {
  return rows.map((spans) => spans.map((span) => span.text).join(''));
}

describe('the confetti a passed gate throws', () => {
  it('scatters the same particles for the same tick', () => {
    expect(confettiRows(8, 40, 4)).toStrictEqual(confettiRows(8, 40, 4));
  });

  it('fills exactly the room it is given', () => {
    const rows = textOf(confettiRows(8, 40, 4));

    expect(rows).toHaveLength(4);
    rows.forEach((row) => {
      expect(row).toHaveLength(40);
    });
  });

  it('moves the particles between ticks', () => {
    expect(textOf(confettiRows(8, 40, 4))).not.toStrictEqual(textOf(confettiRows(10, 40, 4)));
  });

  it('throws at least one particle in a room this size', () => {
    expect(
      textOf(confettiRows(8, 40, 4))
        .join('')
        .trim(),
    ).not.toBe('');
  });
});
