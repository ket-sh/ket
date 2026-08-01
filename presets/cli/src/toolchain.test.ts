import { repositoryRootFrom } from '@ket/preset';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { CLI_SEMANTICS } from './semantics.ts';

async function readsPresetFile(name: string): Promise<string> {
  const kept = join(import.meta.dirname, '..', 'files', name);
  const shared = join(repositoryRootFrom(import.meta.dirname), 'packages', 'preset', 'files', name);

  return readFile(kept, 'utf8').catch(async () => readFile(shared, 'utf8'));
}

describe('the toolchain the cli preset declares', () => {
  it('uses every tool it declares, so a version pin cannot outlive its user', async () => {
    const declared = await readsPresetFile('mise.toml');
    const tools = [...declared.matchAll(/^(\S+) = /gmu)].map(([, tool]) => tool ?? '');
    const uses = [
      JSON.stringify(CLI_SEMANTICS.scripts),
      await readsPresetFile('lefthook.yml'),
      await readsPresetFile('github-ci.yml'),
    ].join('\n');

    for (const tool of tools) {
      expect({ tool, used: uses.includes(tool) }).toStrictEqual({ tool, used: true });
    }
  });

  it('installs the toolchain before it runs a tool from it', () => {
    for (const [name, script] of Object.entries(CLI_SEMANTICS.scripts)) {
      if (script.includes('mise exec')) {
        expect({ name, installs: script.includes('mise install') }).toStrictEqual({
          name,
          installs: true,
        });
      }
    }
  });
});

describe('what the law says about the toolchain', () => {
  it('names the tool the scripts reach for, so a missing command is not a surprise', async () => {
    const law = await readsPresetFile('CLAUDE.md');
    const reaching = Object.entries(CLI_SEMANTICS.scripts).filter(([, script]) =>
      script.includes('mise'),
    );

    expect(reaching.length).toBeGreaterThan(0);
    expect(law).toContain('mise');
  });

  it('names every script that needs it, since a reader has to know which ones', async () => {
    const law = await readsPresetFile('CLAUDE.md');

    for (const [name, script] of Object.entries(CLI_SEMANTICS.scripts)) {
      if (script.includes('mise')) {
        expect({ name, named: law.includes(name) }).toStrictEqual({ name, named: true });
      }
    }
  });
});
