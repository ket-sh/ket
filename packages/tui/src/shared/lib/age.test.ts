import { describe, expect, it } from 'vitest';

import { ageOf } from './age.ts';

const NOW = '2026-08-07T12:00:00.000Z';

describe('the age a card wears', () => {
  it('speaks seconds under a minute', () => {
    expect(ageOf('2026-08-07T11:59:15.000Z', NOW)).toBe('45s');
  });

  it('speaks minutes under an hour', () => {
    expect(ageOf('2026-08-07T11:48:00.000Z', NOW)).toBe('12m');
  });

  it('speaks hours under a day', () => {
    expect(ageOf('2026-08-07T10:00:00.000Z', NOW)).toBe('2h');
  });

  it('speaks days from there on', () => {
    expect(ageOf('2026-08-04T12:00:00.000Z', NOW)).toBe('3d');
  });

  it('reads a fresh card as zero seconds, never as a negative age', () => {
    expect(ageOf(NOW, NOW)).toBe('0s');
    expect(ageOf('2026-08-07T12:00:05.000Z', NOW)).toBe('0s');
  });

  it('says nothing about a moment it cannot read', () => {
    expect(ageOf('never', NOW)).toBe('');
  });
});
