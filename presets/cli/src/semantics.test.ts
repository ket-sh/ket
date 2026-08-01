import { repositoryRootFrom } from '@ket/preset';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { CLI_SEMANTICS } from './semantics.ts';

const OUR_CLI = join(repositoryRootFrom(import.meta.dirname), 'packages', 'cli');

// A file every preset writes alike is kept once beside the package that
// declares it, and only what this preset differs on sits in its own files.
async function readsPresetFile(name: string): Promise<string> {
  const kept = join(import.meta.dirname, '..', 'files', name);
  const shared = join(repositoryRootFrom(import.meta.dirname), 'packages', 'preset', 'files', name);

  return readFile(kept, 'utf8').catch(async () => readFile(shared, 'utf8'));
}

describe('what the cli preset declares about a project', () => {
  it('roots a slice where this repository roots its commands', async () => {
    const commands = await readdir(join(OUR_CLI, 'src', 'commands'));

    expect(commands).toContain('create');
    expect(CLI_SEMANTICS.slice.roots).toStrictEqual(['src/commands/{slice}']);
  });

  it('names the adapter file this repository actually writes', async () => {
    const inside = await readdir(join(OUR_CLI, 'src', 'commands', 'create'));

    expect(inside).toContain(CLI_SEMANTICS.slice.adapters[0]);
  });

  it('keeps the side effects it names apart from the domain beside them', () => {
    expect(CLI_SEMANTICS.slice.adapters).toStrictEqual(['command.ts', 'io/**']);
  });

  it('drives a scenario through the built binary, not a browser', () => {
    expect(CLI_SEMANTICS.acceptance).toStrictEqual({
      runner: '@cucumber/cucumber',
      drives: 'binary',
    });
  });

  it('runs every test on one runner, since the bun exception belongs to the tui', () => {
    expect(CLI_SEMANTICS.testRuntime).toBe('vitest');
  });

  it('asks for no structure gate beyond the dependency graph', () => {
    const scripts = CLI_SEMANTICS.gates.map((gate) => gate.script);

    expect(scripts).not.toContain('lint:structure');
    expect(CLI_SEMANTICS.scripts).not.toHaveProperty('lint:structure');
  });
});

describe('what the cli preset declares about tests', () => {
  it('separates the example suite from the property suite by file name', () => {
    expect(CLI_SEMANTICS.tests.example).not.toBe(CLI_SEMANTICS.tests.property);
  });

  it('marks where a unit name goes in each test pattern', () => {
    expect(CLI_SEMANTICS.tests.example).toBe('{unit}.test.ts');
    expect(CLI_SEMANTICS.tests.property).toBe('{unit}.property.test.ts');
  });
});

describe('what the cli preset declares about gates', () => {
  it('declares a gate chain, since a preset without one guards nothing', () => {
    expect(CLI_SEMANTICS.gates.length).toBeGreaterThan(0);
  });

  it('names only scripts the preset actually writes', () => {
    for (const gate of CLI_SEMANTICS.gates) {
      expect({
        script: gate.script,
        declared: Object.hasOwn(CLI_SEMANTICS.scripts, gate.script),
      }).toStrictEqual({ script: gate.script, declared: true });
    }
  });

  it('says what every gate guards, since a bare command teaches nothing', () => {
    for (const gate of CLI_SEMANTICS.gates) {
      expect({ script: gate.script, says: gate.guards.length > 0 }).toStrictEqual({
        script: gate.script,
        says: true,
      });
    }
  });

  it('keeps every description inside the width a table can hold', () => {
    for (const gate of CLI_SEMANTICS.gates) {
      expect({ script: gate.script, short: gate.guards.length <= 42 }).toStrictEqual({
        script: gate.script,
        short: true,
      });
    }
  });

  it('writes every description as a sentence, not as a fragment', () => {
    for (const gate of CLI_SEMANTICS.gates) {
      expect({
        script: gate.script,
        sentence: /^It [a-z].*\.$/.test(gate.guards),
      }).toStrictEqual({ script: gate.script, sentence: true });
    }
  });

  it('gives each gate its own description, since two gates guarding one thing is one gate', () => {
    const guarded = CLI_SEMANTICS.gates.map((gate) => gate.guards);

    expect(new Set(guarded).size).toBe(guarded.length);
  });

  it('guards the whole chain, not only the tests', () => {
    const scripts = CLI_SEMANTICS.gates.map((gate) => gate.script);

    for (const gate of ['lint', 'check-types', 'test', 'test:mutation']) {
      expect(scripts).toContain(gate);
    }
  });
});

describe('the shape of what the cli preset declares', () => {
  it('gives every script a command to run', () => {
    for (const [name, command] of Object.entries(CLI_SEMANTICS.scripts)) {
      expect({ name, runs: command.length > 0 }).toStrictEqual({ name, runs: true });
    }
  });

  it('names the substrate a hermetic test writes into', () => {
    expect(CLI_SEMANTICS.substrate).toBe('temporary-directories');
  });

  it('names the lockfile as a file, since a workspace keeps one in any directory', () => {
    expect(CLI_SEMANTICS.lockfile).not.toContain('/');
  });

  it('keeps the adapter and the edge apart from the domain, and nothing else', () => {
    expect(CLI_SEMANTICS.slice.adapters).toStrictEqual(['command.ts', 'io/**']);
  });
});

describe('the test-first gate against the config the cli preset writes', () => {
  it('guards the source a slice lands in, not the layout of some other repository', async () => {
    const configuration = await readsPresetFile('probity.config.ts');
    const quoted = [...configuration.matchAll(/'(?<glob>[^']+)'/gu)]
      .map((found) => found.groups?.['glob'] ?? '')
      .filter((glob) => glob.includes('*') && !glob.startsWith('!'));
    const roots = quoted.map((glob) => glob.split('/')[0]);

    expect(roots.length).toBeGreaterThan(0);
    const declared = CLI_SEMANTICS.slice.roots.map((root) => root.split('/')[0]);

    expect(new Set(roots)).toStrictEqual(new Set(declared));
  });

  it('leaves the tests it drives out, since a test is what unlocks the source', async () => {
    const configuration = await readsPresetFile('probity.config.ts');

    expect(configuration).toContain('!**/*.test.*');
  });
});

describe('the prose gate against the config the cli preset writes', () => {
  it('syncs the very package its prose config declares, so a fresh checkout finds it', async () => {
    const configuration = await readsPresetFile('vale.ini');
    const declared = /\/(?<name>[A-Za-z]+)\.zip/u.exec(configuration)?.groups?.['name'];

    expect(declared).toBeDefined();
    expect(CLI_SEMANTICS.scripts['lint:prose']).toContain(`.vale/styles/${declared ?? ''}`);
  });
});
