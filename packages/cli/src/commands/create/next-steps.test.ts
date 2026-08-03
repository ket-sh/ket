import { describe, expect, it } from 'vitest';

import { nextSteps } from './next-steps.ts';

describe('telling the reader what to do next', () => {
  it('sends them into the directory before anything else', () => {
    expect(nextSteps('my-app', {})[0]).toStrictEqual({
      says: 'Move into it',
      runs: 'cd my-app',
    });
  });

  it('quotes a directory a shell would split', () => {
    expect(nextSteps('my app', {})[0]?.runs).toBe('cd "my app"');
  });

  it('leaves out the move when they are already there', () => {
    expect(nextSteps('.', {})).toStrictEqual([
      { says: 'Install the toolchain', runs: 'bun install' },
    ]);
  });

  it('asks for the install ket deliberately left to them', () => {
    expect(nextSteps('my-app', {})).toStrictEqual([
      { says: 'Move into it', runs: 'cd my-app' },
      { says: 'Install the toolchain', runs: 'bun install' },
    ]);
  });

  it('gives every step both a sentence and a command', () => {
    for (const step of nextSteps('my-app', { dev: 'ket watch' })) {
      expect({ says: step.says.length > 0, runs: step.runs.length > 0 }).toStrictEqual({
        says: true,
        runs: true,
      });
    }
  });
});

describe('the script the reader is told to start with', () => {
  it('says why it starts with the script the preset means them to start with', () => {
    expect(nextSteps('my-app', { dev: 'ket watch', test: 'vitest' }).at(-1)).toStrictEqual({
      says: 'Start the loop',
      runs: 'bun run dev',
    });
  });

  it('falls back to the suite when the preset has no dev script', () => {
    expect(nextSteps('my-app', { build: 'tsc', test: 'vitest' }).at(-1)).toStrictEqual({
      says: 'Run the suite',
      runs: 'bun run test',
    });
  });

  it('falls back to the build when the preset has neither', () => {
    expect(nextSteps('my-app', { build: 'tsc', lint: 'oxlint' }).at(-1)).toStrictEqual({
      says: 'Build it',
      runs: 'bun run build',
    });
  });

  it('suggests no script when the preset declares none it can start', () => {
    expect(nextSteps('my-app', { lint: 'oxlint' }).at(-1)).toStrictEqual({
      says: 'Install the toolchain',
      runs: 'bun install',
    });
  });
});

describe('the gallery, when the scaffold ships one', () => {
  it('offers it right after the dev loop step', () => {
    const scripts = { dev: 'ket watch', storybook: 'storybook dev -p 6006' };

    expect(nextSteps('my-app', scripts).slice(-2)).toStrictEqual([
      { says: 'Start the loop', runs: 'bun run dev' },
      { says: 'Open the component gallery', runs: 'bun run storybook' },
    ]);
  });

  it('stays out of the list when the scaffold ships no storybook script', () => {
    expect(nextSteps('my-app', { dev: 'ket watch' })).toStrictEqual([
      { says: 'Move into it', runs: 'cd my-app' },
      { says: 'Install the toolchain', runs: 'bun install' },
      { says: 'Start the loop', runs: 'bun run dev' },
    ]);
  });
});
