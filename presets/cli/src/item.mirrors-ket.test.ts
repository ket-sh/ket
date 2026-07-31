import { repositoryRootFrom } from '@ket/preset';
import { readdir } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

import { CLI_PRESET } from './item.ts';
import { CLI_SEMANTICS } from './semantics.ts';

const CONFIG_PATTERN = /^\.?[a-z0-9-]+(\.config)?\.(json|ts|cjs|yml|yaml|toml|ini)$/;

const MONOREPO_ONLY = new Set([
  'package.json',
  'bun.lock',
  'turbo.json',
  'steiger.config.ts',
  'tsconfig.base.json',
  'tsconfig.root-configs.json',
  'coderabbit.yaml',
  '.coderabbit.yaml',
]);

const REPOSITORY_ROOT = repositoryRootFrom(import.meta.dirname);

describe('the cli preset against this repository', () => {
  it('mirrors every config this repository keeps, or says why it does not', async () => {
    const entries = await readdir(REPOSITORY_ROOT);
    const configs = entries.filter((entry) => CONFIG_PATTERN.test(entry));
    const targets = new Set(CLI_PRESET.files.map((file) => file.target));
    const missing = configs.filter(
      (config) => !MONOREPO_ONLY.has(config) && !targets.has(`~/${config}`),
    );

    expect(missing).toStrictEqual([]);
  });

  it('names the lockfile this repository actually keeps, since the gate refuses it', async () => {
    const entries = await readdir(REPOSITORY_ROOT);

    expect(entries).toContain(CLI_SEMANTICS.lockfile);
  });
});
