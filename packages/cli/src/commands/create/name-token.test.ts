import { describe, expect, it } from 'vitest';

import { withProjectName } from './name-token.ts';

describe('putting the project name into a file the preset ships', () => {
  it('replaces the token with the name', () => {
    expect(withProjectName("meta: { name: '__PROJECT_NAME__' }", 'my-app')).toBe(
      "meta: { name: 'my-app' }",
    );
  });

  it('replaces every occurrence, not only the first', () => {
    expect(withProjectName('__PROJECT_NAME__ and __PROJECT_NAME__', 'my-app')).toBe(
      'my-app and my-app',
    );
  });

  it('leaves a file that carries no token untouched', () => {
    expect(withProjectName('plain contents', 'my-app')).toBe('plain contents');
  });
});
