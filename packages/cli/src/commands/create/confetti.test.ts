import { describe, expect, it } from 'vitest';

import { confetti, SPARKS } from './confetti.ts';

function allowed(cell: string): boolean {
  return cell.length === 1 && (cell === ' ' || SPARKS.includes(cell));
}

describe('scattering confetti across the closing screen', () => {
  it('fills exactly the width it was asked for', () => {
    expect(confetti(40, 'orders')).toHaveLength(40);
  });

  it('scatters nothing across no width at all', () => {
    expect(confetti(0, 'orders')).toStrictEqual([]);
  });

  it('drops only sparks and gaps, never anything a terminal would mangle', () => {
    for (const cell of confetti(200, 'orders')) {
      expect({ cell, drop: allowed(cell) }).toStrictEqual({ cell, drop: true });
    }
  });

  it('falls the same way twice for one project, since a redraw must not jitter', () => {
    expect(confetti(60, 'orders')).toStrictEqual(confetti(60, 'orders'));
  });

  it('falls differently for a different project', () => {
    expect(confetti(60, 'orders')).not.toStrictEqual(confetti(60, 'billing'));
  });

  it('leaves gaps, since a solid row of sparks is a line and not confetti', () => {
    const scattered = confetti(200, 'orders');

    expect(scattered.filter((cell) => cell === ' ').length).toBeGreaterThan(0);
  });

  it('drops sparks, since an empty row is not confetti either', () => {
    const scattered = confetti(200, 'orders');

    expect(scattered.filter((cell) => cell !== ' ').length).toBeGreaterThan(0);
  });

  it('offers more than one spark to scatter', () => {
    expect(new Set(Array.from(SPARKS)).size).toBeGreaterThan(1);
  });
});

describe('how the confetti falls', () => {
  it('leaves room to breathe, so the row reads as confetti and not as a fill', () => {
    const scattered = confetti(600, 'orders');
    const sparks = scattered.filter((cell) => cell !== ' ').length;

    expect(sparks / scattered.length).toBeGreaterThan(0.35);
    expect(sparks / scattered.length).toBeLessThan(0.65);
  });

  it('falls exactly this way for a given project, since the pattern belongs to it', () => {
    expect(confetti(16, 'ket')).toStrictEqual([
      '˚',
      ' ',
      '⋆',
      ' ',
      ' ',
      '✧',
      ' ',
      ' ',
      '✦',
      '✦',
      '˚',
      '✧',
      ' ',
      '✦',
      '✧',
      ' ',
    ]);
  });
});
