import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { CLI_SEMANTICS, sliceDirectoryOf } from './semantics.ts';

const OUR_CLI = join(import.meta.dirname, '..', '..', '..', 'packages', 'cli');

describe('what the cli preset declares about a project', () => {
  it('roots a slice where this repository roots its commands', async () => {
    const commands = await readdir(join(OUR_CLI, 'src', 'commands'));

    expect(commands).toContain('init');
    expect(CLI_SEMANTICS.slice.root).toBe('src/commands/{slice}');
  });

  it('names the adapter file this repository actually writes', async () => {
    const inside = await readdir(join(OUR_CLI, 'src', 'commands', 'init'));

    expect(inside).toContain(CLI_SEMANTICS.slice.adapter);
  });

  it('keeps mutation off the adapter, since §7 scopes it to the domain', () => {
    expect(CLI_SEMANTICS.slice.mutate).toContain(`!${CLI_SEMANTICS.slice.adapter}`);
  });

  it('drives acceptance through the built binary, not a browser', () => {
    expect(CLI_SEMANTICS.acceptance).toStrictEqual({ runner: 'cucumber', drives: 'binary' });
  });

  it('runs every test on one runner, since the bun exception belongs to the tui', () => {
    expect(CLI_SEMANTICS.testRuntime).toBe('vitest');
  });

  it('asks for no structure gate beyond the dependency graph', () => {
    expect(CLI_SEMANTICS.gates).toStrictEqual([]);
  });
});

describe('resolving a slice directory', () => {
  it('fills the slice name into the root the preset declares', () => {
    expect(sliceDirectoryOf(CLI_SEMANTICS, 'auth-login')).toBe('src/commands/auth-login');
  });

  it('refuses a slice name that would escape the root', () => {
    expect(() => sliceDirectoryOf(CLI_SEMANTICS, '../elsewhere')).toThrow(/slice name/);
  });
});
