import { describe, expect, it } from 'vitest';

import { configuredFromFlags } from './flags.ts';

const A_CODE = 'b2D0vQ7G4';

describe('reading a creation from flags alone', () => {
  it('refuses a language that is not a tag', () => {
    expect(() =>
      configuredFromFlags('AUTH', undefined, 'web', undefined, 'English!', true),
    ).toThrow('the documentation language is a lowercase tag like en or tr, and English! arrived');
  });

  it('refuses a malformed shadcn code in the words of the code gate', () => {
    expect(() => configuredFromFlags('AUTH', undefined, 'web', 'b_23', 'en', true)).toThrow(
      'b_23 is not a shadcn preset code. Copy yours from ui.shadcn.com/create',
    );
  });

  it('carries the shadcn code into the configuration', () => {
    expect(configuredFromFlags('AUTH', undefined, 'web', A_CODE, 'en', true)).toStrictEqual({
      key: 'AUTH',
      targets: { '.': 'web' },
      integrations: [],
      shadcnPreset: A_CODE,
      language: 'en',
      workflow: true,
    });
  });

  it('keeps the configuration free of a code nobody gave', () => {
    expect(configuredFromFlags('AUTH', undefined, 'web', undefined, 'en', false)).toStrictEqual({
      key: 'AUTH',
      targets: { '.': 'web' },
      integrations: [],
      language: 'en',
      workflow: false,
    });
  });

  it('configures nothing without a key', () => {
    expect(configuredFromFlags(undefined, undefined, 'web', undefined, 'en', true)).toBeUndefined();
  });
});
