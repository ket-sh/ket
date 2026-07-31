import { describe, expect, it } from 'vitest';

import { greeting } from './greeting.ts';

describe('greeting somebody', () => {
  it('greets the name it was given', () => {
    expect(greeting('ada')).toBe('hello ada');
  });

  it('greets the world when nobody was named', () => {
    expect(greeting(undefined)).toBe('hello world');
  });

  it('greets the world when the name is only spaces', () => {
    expect(greeting('   ')).toBe('hello world');
  });

  it('drops the spaces around a name', () => {
    expect(greeting('  ada  ')).toBe('hello ada');
  });
});
