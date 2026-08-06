import { describe, expect, it } from 'vitest';

import type { Configuration } from '../../shared/configuration.ts';

import { heroHint, withProjectNames } from './name-token.ts';

const HINT = { text: 'Make it yours: edit', code: 'src/entities/welcome' };

const PROJECT = { name: 'my-app', key: 'SHOP', hint: HINT };

const CONFIGURED: Configuration = {
  key: 'SHOP',
  targets: { '.': 'web' },
  integrations: [],
  language: 'en',
  workflow: true,
};

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

describe('putting the hint the hero page shows into a file the preset ships', () => {
  it('replaces the hint sentence token with the sentence the project chose', () => {
    expect(withProjectNames('<p>__HERO_HINT_TEXT__</p>', PROJECT)).toBe(
      '<p>Make it yours: edit</p>',
    );
  });

  it('replaces the hint code token with the code the project chose', () => {
    expect(withProjectNames('<code>__HERO_HINT_CODE__</code>', PROJECT)).toBe(
      '<code>src/entities/welcome</code>',
    );
  });

  it('replaces both hint tokens in one file, not whichever comes first', () => {
    expect(withProjectNames('__HERO_HINT_TEXT__ __HERO_HINT_CODE__', PROJECT)).toBe(
      'Make it yours: edit src/entities/welcome',
    );
  });

  it('replaces every occurrence of the hint sentence, not only the first', () => {
    expect(withProjectNames('__HERO_HINT_TEXT__ and __HERO_HINT_TEXT__', PROJECT)).toBe(
      'Make it yours: edit and Make it yours: edit',
    );
  });

  it('replaces every occurrence of the hint code as well', () => {
    expect(withProjectNames('__HERO_HINT_CODE__ and __HERO_HINT_CODE__', PROJECT)).toBe(
      'src/entities/welcome and src/entities/welcome',
    );
  });
});

describe('choosing what the hero page points a newcomer at', () => {
  it('points a project that took the pipeline at the command that files work', () => {
    expect(heroHint(CONFIGURED)).toStrictEqual({
      text: 'Start your first feature in Claude Code with',
      code: '/ket:feature "your prompt"',
    });
  });

  it('points a project that took the gates alone at the source it should edit', () => {
    expect(heroHint({ ...CONFIGURED, workflow: false })).toStrictEqual({
      text: 'Make it yours: edit',
      code: 'src/entities/welcome',
    });
  });
});
