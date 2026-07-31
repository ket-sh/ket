import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { CLI_SEMANTICS } from './semantics.ts';

async function readsPresetFile(name: string): Promise<string> {
  return readFile(join(import.meta.dirname, '..', 'files', name), 'utf8');
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
