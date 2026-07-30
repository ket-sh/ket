import { describe, expect, it } from 'vitest';

import { refuseKey } from './key.ts';

describe('judging the key the wizard was given', () => {
  it('accepts what the person typed', () => {
    expect(refuseKey('AUTH', '')).toBeUndefined();
  });

  it('accepts an empty answer when a suggestion stands behind it', () => {
    expect(refuseKey('', 'OS')).toBeUndefined();
  });

  it('refuses an empty answer with nothing behind it', () => {
    expect(refuseKey('', '')).toBe('Use two to ten capital letters');
  });

  it('refuses lowercase, since item IDs read as AUTH-3', () => {
    expect(refuseKey('auth', '')).toBe('Use two to ten capital letters');
  });

  it('refuses a single letter and a long run alike', () => {
    expect(refuseKey('A', '')).toBe('Use two to ten capital letters');
    expect(refuseKey('ABCDEFGHIJK', '')).toBe('Use two to ten capital letters');
  });

  it('judges what was typed, not the suggestion behind it', () => {
    expect(refuseKey('nope', 'OS')).toBe('Use two to ten capital letters');
  });
});
