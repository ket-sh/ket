import { describe, expect, it } from 'vitest';

import { cn } from './cn.ts';

describe('joining the classes a component was given', () => {
  it('keeps classes that set different properties', () => {
    expect(cn('text-ink', 'p-4')).toBe('text-ink p-4');
  });

  it('lets the caller override what the component set, since theirs comes last', () => {
    expect(cn('p-4', 'p-8')).toBe('p-8');
  });

  it('drops a class the caller passed as nothing', () => {
    expect(cn('p-4', undefined, false)).toBe('p-4');
  });

  it('reads a list as the classes in it', () => {
    expect(cn(['text-ink', 'p-4'])).toBe('text-ink p-4');
  });
});
