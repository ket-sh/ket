import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { CLI_PRESET } from './item.ts';
import { repositoryRootFrom } from './repository-root.ts';

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

const REPOSITORY_ROOT = repositoryRootFrom(import.meta.dirname);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function isVersionMap(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((version) => typeof version === 'string');
}

function splitPin(pin: string): { name: string; version: string } {
  const at = pin.lastIndexOf('@');

  return { name: pin.slice(0, at), version: pin.slice(at + 1) };
}

async function readsPresetFile(name: string): Promise<string> {
  return readFile(join(import.meta.dirname, '..', 'files', name), 'utf8');
}

async function compilerOptionsItWrites(): Promise<Record<string, unknown>> {
  const written: unknown = JSON.parse(await readsPresetFile('tsconfig.json'));
  const options = isRecord(written) ? written['compilerOptions'] : undefined;

  if (!isRecord(options)) {
    throw new Error('the tsconfig the preset writes declares no compilerOptions');
  }

  return options;
}

async function lintPluginsItWrites(): Promise<string[]> {
  const written: unknown = JSON.parse(await readsPresetFile('oxlintrc.json'));
  const declared = isRecord(written) ? written['jsPlugins'] : undefined;

  if (!Array.isArray(declared)) {
    return [];
  }

  return declared
    .map((plugin: unknown) => (isRecord(plugin) ? plugin['specifier'] : undefined))
    .filter((specifier): specifier is string => typeof specifier === 'string');
}

async function mutationTestConfigItNames(): Promise<string> {
  const written: unknown = JSON.parse(await readsPresetFile('stryker.conf.json'));
  const runner = isRecord(written) ? written['vitest'] : undefined;
  const named = isRecord(runner) ? runner['configFile'] : undefined;

  if (typeof named !== 'string') {
    throw new Error('the mutation config the preset writes names no test config');
  }

  return named;
}

function namedPackages(options: Record<string, unknown>): string[] {
  const source = options['jsxImportSource'];
  const types = options['types'];

  return [...(typeof source === 'string' ? [source] : []), ...(isStringArray(types) ? types : [])];
}

async function versionsKetPins(): Promise<Record<string, string>> {
  const manifest: unknown = JSON.parse(
    await readFile(join(REPOSITORY_ROOT, 'package.json'), 'utf8'),
  );
  const declared = isRecord(manifest) ? manifest['devDependencies'] : undefined;

  if (!isVersionMap(declared)) {
    throw new Error('the repository manifest declares no devDependencies');
  }

  return declared;
}

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

  it('writes a tsconfig that names no package it does not ship', async () => {
    const options = await compilerOptionsItWrites();
    const shipped = new Set(
      [...CLI_PRESET.dependencies, ...CLI_PRESET.devDependencies].map((pin) => splitPin(pin).name),
    );

    for (const named of namedPackages(options)) {
      expect({
        named,
        shipped: shipped.has(named) || shipped.has(`@types/${named}`),
      }).toStrictEqual({ named, shipped: true });
    }
  });

  it('writes a lint config that names no plugin it does not ship', async () => {
    const shipped = new Set(CLI_PRESET.devDependencies.map((pin) => splitPin(pin).name));

    for (const specifier of await lintPluginsItWrites()) {
      expect({ specifier, shipped: shipped.has(specifier) }).toStrictEqual({
        specifier,
        shipped: true,
      });
    }
  });

  it('ships the test config its mutation config points at', async () => {
    const targets = CLI_PRESET.files.map((file) => file.target);

    expect(targets).toContain(`~/${await mutationTestConfigItNames()}`);
  });
});

describe('the versions the cli preset pins', () => {
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
});
