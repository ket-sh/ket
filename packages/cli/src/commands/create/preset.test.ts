import { describe, expect, it } from 'vitest';

import { presetFrom } from './preset.ts';

describe('the preset a command line names', () => {
  it('reads the name it was given', () => {
    expect(presetFrom('web')).toStrictEqual({ preset: 'web' });
  });

  it('falls back to a command line project when the flag is absent', () => {
    expect(presetFrom(undefined)).toStrictEqual({ preset: 'cli' });
  });

  it('refuses a name that is no project type at all, and says what it can write', () => {
    expect(presetFrom('frontend')).toStrictEqual({
      refused: 'frontend is not a project type ket writes. It writes cli, web',
    });
  });

  it('refuses a project type ket has yet to write a preset for', () => {
    expect(presetFrom('mobile')).toStrictEqual({
      refused: 'mobile is not a project type ket writes. It writes cli, web',
    });
  });

  it('refuses an empty name rather than reading it as nothing', () => {
    expect(presetFrom('')).toStrictEqual({
      refused: ' is not a project type ket writes. It writes cli, web',
    });
  });
});
