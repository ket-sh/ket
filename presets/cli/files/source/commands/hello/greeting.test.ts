import { describe, expect, it } from 'vitest';

import { greeting } from './greeting.ts';

describe('greeting from the command line', () => {
  it('greets the world when no one is named', () => {
    expect(greeting(undefined)).toBe('hello world');
  });

  it('greets the world when the name is left blank', () => {
    expect(greeting('')).toBe('hello world');
  });

  it('greets whoever is named', () => {
    expect(greeting('ada')).toBe('hello ada');
  });
});
