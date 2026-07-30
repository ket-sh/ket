import { describe, expect, it } from 'vitest';

import { directoryLabel } from './directory-label.ts';

describe('labelling the directory a project lands under', () => {
  it('ends with a separator, so the name reads as appended to it', () => {
    expect(directoryLabel('/srv/work', '/home/ada')).toBe('/srv/work/');
  });

  it('shortens the home directory to a tilde', () => {
    expect(directoryLabel('/home/ada/Projects', '/home/ada')).toBe('~/Projects/');
  });

  it('shortens the home directory itself', () => {
    expect(directoryLabel('/home/ada', '/home/ada')).toBe('~/');
  });

  it('leaves a directory that merely starts with the same letters alone', () => {
    expect(directoryLabel('/home/adamant', '/home/ada')).toBe('/home/adamant/');
  });

  it('leaves a path outside the home directory alone', () => {
    expect(directoryLabel('/srv/ada/Projects', '/home/ada')).toBe('/srv/ada/Projects/');
  });
});
