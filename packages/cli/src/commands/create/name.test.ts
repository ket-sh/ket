import { describe, expect, it } from 'vitest';

import { refuseName } from './name.ts';

const ABOVE = 'The name goes under the directory shown, not above it.';

describe('refusing a project name the working directory cannot hold', () => {
  it('accepts a plain name', () => {
    expect(refuseName('my-app')).toBeUndefined();
  });

  it('accepts a name nested under the working directory', () => {
    expect(refuseName('packages/cli')).toBeUndefined();
  });

  it('refuses an empty name', () => {
    expect(refuseName('')).toBe('A name is required.');
  });

  it('refuses a name that is only whitespace', () => {
    expect(refuseName('   ')).toBe('A name is required.');
  });

  it('refuses an absolute path, because the directory above is fixed', () => {
    expect(refuseName('/tmp/my-app')).toBe(ABOVE);
  });

  it('refuses a name that climbs out of the directory shown', () => {
    expect(refuseName('../my-app')).toBe(ABOVE);
  });

  it('refuses a climb hidden further along the path', () => {
    expect(refuseName('packages/../../my-app')).toBe(ABOVE);
  });

  it('accepts a climb that stays inside the directory shown', () => {
    expect(refuseName('packages/../my-app')).toBeUndefined();
  });

  it('refuses a character a terminal cannot print', () => {
    expect(refuseName('myapp')).toBe('The name carries a character a terminal cannot print.');
  });
});

describe('refusing a project name the scaffold cannot carry into its files', () => {
  const UNSAFE = 'A name is letters, digits, dots, underscores, and dashes.';

  it('refuses a quote, which would cut the string literal the name lands in', () => {
    expect(refuseName("x'; const z = '")).toBe(UNSAFE);
  });

  it('refuses a space', () => {
    expect(refuseName('my app')).toBe(UNSAFE);
  });

  it('refuses a backslash', () => {
    expect(refuseName('my\\app')).toBe(UNSAFE);
  });

  it('judges every segment of a nested name, not the slashes between them', () => {
    expect(refuseName('packages/my cli')).toBe(UNSAFE);
  });

  it('accepts dots, underscores, and dashes', () => {
    expect(refuseName('shop.front_2-beta')).toBeUndefined();
  });

  it('accepts a trailing slash, since a path may end in one', () => {
    expect(refuseName('my-app/')).toBeUndefined();
  });
});
