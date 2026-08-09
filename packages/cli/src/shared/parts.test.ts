import { describe, expect, it } from 'vitest';

import { KET_PARTS, partSays } from './parts.ts';

describe('the parts the ket command is made of', () => {
  it('names every part the top-level help offers, in help order', () => {
    expect(KET_PARTS.map((part) => part.name)).toStrictEqual([
      'create',
      'update',
      'watch',
      'map',
      'retro',
    ]);
  });

  it('speaks each purpose in the words the help already uses', () => {
    expect(partSays('create')).toBe('Create a project under ket');
    expect(partSays('update')).toBe('Bring the files ket wrote back to what it ships now');
    expect(partSays('watch')).toBe('Watch the pipeline as it runs');
    expect(partSays('map')).toBe('Read the story map this project keeps');
    expect(partSays('retro')).toBe('Fold the event log into the week it covers');
  });

  it('answers an unknown part with its bare name rather than nothing', () => {
    expect(partSays('gate')).toBe('gate');
  });
});
