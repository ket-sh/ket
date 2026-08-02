import { describe, expect, it } from 'vitest';

import { welcomeTo } from './welcome.ts';

describe('welcoming a project', () => {
  it('welcomes by the name it was given', () => {
    expect(welcomeTo('atlas')).toBe('Welcome to atlas.');
  });

  it('welcomes the nameless project when nobody named it', () => {
    expect(welcomeTo(undefined)).toBe('Welcome to your project.');
  });

  it('welcomes the nameless project when the name is only spaces', () => {
    expect(welcomeTo('   ')).toBe('Welcome to your project.');
  });

  it('drops the spaces around a name', () => {
    expect(welcomeTo('  atlas  ')).toBe('Welcome to atlas.');
  });
});
