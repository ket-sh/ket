import { describe, expect, it } from 'vitest';

import { addTarget, refuseDirectory } from './targets.ts';

describe('judging a directory before the preset is known', () => {
  it('accepts a directory nothing has claimed', () => {
    expect(refuseDirectory({}, '.')).toBeUndefined();
  });

  it('refuses one already spoken for', () => {
    expect(refuseDirectory({ 'packages/cli': 'cli' }, 'packages/cli')).toBe(
      'packages/cli already has a preset',
    );
  });

  it('refuses one that climbs out of the repository', () => {
    expect(refuseDirectory({}, '../elsewhere')).toBe('../elsewhere reaches outside the repository');
  });

  it('refuses an empty one', () => {
    expect(refuseDirectory({}, '')).toBe('a target needs a directory');
  });
});

describe('adding a target the wizard collected', () => {
  it('records the directory against the preset that governs it', () => {
    expect(addTarget({}, '.', 'cli')).toStrictEqual({
      added: { '.': 'cli' },
    });
  });

  it('keeps the targets already gathered', () => {
    expect(addTarget({ 'packages/cli': 'cli' }, 'packages/tui', 'tui')).toStrictEqual({
      added: { 'packages/cli': 'cli', 'packages/tui': 'tui' },
    });
  });

  it('refuses a directory already spoken for, so the wizard can ask again', () => {
    expect(addTarget({ 'packages/cli': 'cli' }, 'packages/cli', 'tui')).toStrictEqual({
      refused: 'packages/cli already has a preset',
    });
  });

  it('refuses a preset ket does not ship', () => {
    expect(addTarget({}, '.', 'rails')).toStrictEqual({
      refused: 'ket ships no preset named rails',
    });
  });

  it('refuses a directory that climbs out of the repository', () => {
    expect(addTarget({}, '../elsewhere', 'cli')).toStrictEqual({
      refused: '../elsewhere reaches outside the repository',
    });
  });

  it('refuses an absolute directory, since targets are recorded relative to the root', () => {
    expect(addTarget({}, '/tmp/app', 'cli')).toStrictEqual({
      refused: '/tmp/app reaches outside the repository',
    });
  });

  it('refuses an empty directory rather than recording a nameless target', () => {
    expect(addTarget({}, '', 'cli')).toStrictEqual({
      refused: 'a target needs a directory',
    });
  });
});
