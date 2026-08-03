import { describe, expect, it } from 'vitest';

import { projectNames, withProjectNames } from './name-token.ts';

const PROJECT = { name: 'my-app', key: 'SHOP' };

describe('putting what a project is called into a file the preset ships', () => {
  it('replaces the name token with the name', () => {
    expect(withProjectNames("meta: { name: '__PROJECT_NAME__' }", PROJECT)).toBe(
      "meta: { name: 'my-app' }",
    );
  });

  it('replaces the key token with the key items are numbered under', () => {
    expect(withProjectNames('__PROJECT_KEY__-1', PROJECT)).toBe('SHOP-1');
  });

  it('replaces every occurrence, not only the first', () => {
    expect(withProjectNames('__PROJECT_NAME__ and __PROJECT_NAME__', PROJECT)).toBe(
      'my-app and my-app',
    );
  });

  it('replaces every occurrence of the key as well', () => {
    expect(withProjectNames('__PROJECT_KEY__ and __PROJECT_KEY__', PROJECT)).toBe('SHOP and SHOP');
  });

  it('replaces both tokens in one file, not whichever comes first', () => {
    expect(withProjectNames('__PROJECT_NAME__ files under __PROJECT_KEY__', PROJECT)).toBe(
      'my-app files under SHOP',
    );
  });

  it('leaves a file that carries no token untouched', () => {
    expect(withProjectNames('plain contents', PROJECT)).toBe('plain contents');
  });
});

describe('the names a project is written into its own files under', () => {
  it('carries the name and the key it was given', () => {
    expect(projectNames('my-app', 'SHOP')).toStrictEqual({ name: 'my-app', key: 'SHOP' });
  });
});
