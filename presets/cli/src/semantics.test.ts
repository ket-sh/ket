import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { CLI_SEMANTICS, sliceDirectoryOf, testFileFor } from './semantics.ts';

const OUR_CLI = join(import.meta.dirname, '..', '..', '..', 'packages', 'cli');

describe('what the cli preset declares about a project', () => {
  it('roots a slice where this repository roots its commands', async () => {
    const commands = await readdir(join(OUR_CLI, 'src', 'commands'));

    expect(commands).toContain('create');
    expect(CLI_SEMANTICS.slice.root).toBe('src/commands/{slice}');
  });

  it('names the adapter file this repository actually writes', async () => {
    const inside = await readdir(join(OUR_CLI, 'src', 'commands', 'create'));

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
    const scripts = CLI_SEMANTICS.gates.map((gate) => gate.script);

    expect(scripts).not.toContain('lint:structure');
    expect(CLI_SEMANTICS.scripts).not.toHaveProperty('lint:structure');
  });
});

describe('what the cli preset declares about tests', () => {
  it('separates the example suite from the property suite by file name', () => {
    expect(CLI_SEMANTICS.tests.example).not.toBe(CLI_SEMANTICS.tests.property);
  });

  it('names both suites after the unit they cover', () => {
    expect(testFileFor(CLI_SEMANTICS.tests.example, 'greeting')).toBe('greeting.test.ts');
    expect(testFileFor(CLI_SEMANTICS.tests.property, 'greeting')).toBe('greeting.property.test.ts');
  });

  it('refuses a unit name a file system would not hold', () => {
    expect(() => testFileFor(CLI_SEMANTICS.tests.property, 'Greeting Two')).toThrow(
      'Greeting Two is not a unit name',
    );
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

describe('resolving a slice directory', () => {
  it('fills the slice name into the root the preset declares', () => {
    expect(sliceDirectoryOf(CLI_SEMANTICS, 'auth-login')).toBe('src/commands/auth-login');
  });

  it('refuses a slice name that would escape the root', () => {
    expect(() => sliceDirectoryOf(CLI_SEMANTICS, '../elsewhere')).toThrow(/slice name/);
  });
});
