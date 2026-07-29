import { access, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { CLI_PRESET } from './item.ts';

const CONFIGURED_BY: Record<string, string> = {
  oxlint: '~/.oxlintrc.json',
  oxfmt: '~/.oxfmtrc.json',
  vitest: '~/vitest.config.ts',
  '@stryker-mutator/core': '~/stryker.conf.json',
  'dependency-cruiser': '~/.dependency-cruiser.cjs',
  knip: '~/knip.json',
  jscpd: '~/.jscpd.json',
  cspell: '~/cspell.json',
  lefthook: '~/lefthook.yml',
  '@commitlint/cli': '~/commitlint.config.ts',
  '@nizos/probity': '~/probity.config.ts',
  typescript: '~/tsconfig.json',
};

const CONFIG_PATTERN = /^\.?[a-z0-9-]+(\.config)?\.(json|ts|cjs|yml|yaml|toml|ini)$/;

const MONOREPO_ONLY = new Set([
  'package.json',
  'bun.lock',
  'turbo.json',
  'steiger.config.ts',
  'tsconfig.base.json',
  'tsconfig.root-configs.json',
  'skills-lock.json',
  'coderabbit.yaml',
  '.coderabbit.yaml',
]);

const REPOSITORY_ROOT = join(import.meta.dirname, '..', '..', '..');

function isVersionMap(value: unknown): value is Record<string, string> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.values(value).every((version) => typeof version === 'string')
  );
}

function devDependenciesOf(manifest: unknown): unknown {
  return typeof manifest === 'object' && manifest !== null && 'devDependencies' in manifest
    ? manifest.devDependencies
    : undefined;
}

async function versionsKetPins(): Promise<Record<string, string>> {
  const manifest: unknown = JSON.parse(
    await readFile(join(REPOSITORY_ROOT, 'package.json'), 'utf8'),
  );
  const declared = devDependenciesOf(manifest);

  if (!isVersionMap(declared)) {
    throw new Error('the repository manifest declares no devDependencies');
  }

  return declared;
}

function splitPin(pin: string): { name: string; version: string } {
  const at = pin.lastIndexOf('@');

  return { name: pin.slice(0, at), version: pin.slice(at + 1) };
}

describe('the cli preset item', () => {
  it('pins every package it ships, since a range moves a gate without a commit', () => {
    for (const pin of CLI_PRESET.devDependencies) {
      expect(splitPin(pin).version).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });

  it('ships the same versions ket runs, so a user gets the gate ket tested', async () => {
    const pinned = await versionsKetPins();

    for (const pin of CLI_PRESET.devDependencies) {
      const { name, version } = splitPin(pin);
      const ours = pinned[name];

      if (ours !== undefined) {
        expect(`${name}@${version}`).toBe(`${name}@${ours}`);
      }
    }
  });

  it('declares the whole gate chain, not a sample of it', () => {
    const names = CLI_PRESET.devDependencies.map((pin) => splitPin(pin).name);

    for (const gate of ['oxlint', 'oxfmt', 'vitest', 'lefthook', 'knip', 'jscpd', 'cspell']) {
      expect(names).toContain(gate);
    }
  });

  it('writes a config for every gate that reads one, since a gate without one runs on defaults', () => {
    const targets = CLI_PRESET.files.map((file) => file.target);

    for (const [gate, config] of Object.entries(CONFIGURED_BY)) {
      expect({ gate, targets: targets.includes(config) }).toStrictEqual({ gate, targets: true });
    }
  });

  it('carries the toolchain manifest, since four gates arrive through mise and not npm', () => {
    const targets = CLI_PRESET.files.map((file) => file.target);

    expect(targets).toContain('~/mise.toml');

    for (const config of ['~/.gitleaks.toml', '~/.vale.ini']) {
      expect(targets).toContain(config);
    }
  });

  it('targets every file it writes at a path inside the repository it configures', () => {
    expect(CLI_PRESET.files.length).toBeGreaterThan(0);

    for (const file of CLI_PRESET.files) {
      expect(file.target.startsWith('~/')).toBe(true);
    }
  });

  it('carries every file it promises, since a missing one fails at init and not here', async () => {
    for (const file of CLI_PRESET.files) {
      await expect(access(join(import.meta.dirname, '..', file.path))).resolves.toBeUndefined();
    }
  });
});

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

  it('names the preset ket resolves it by', () => {
    expect(CLI_PRESET.name).toBe('ket-cli');
  });
});
