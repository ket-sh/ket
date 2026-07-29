import { access, readdir, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { CLI_PRESET } from './item.ts';
import { CLI_SEMANTICS, testFileFor } from './semantics.ts';

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

async function compilerOptionsItWrites(): Promise<Record<string, unknown>> {
  const written: unknown = JSON.parse(
    await readFile(join(import.meta.dirname, '..', 'files', 'tsconfig.json'), 'utf8'),
  );
  const options = isRecord(written) ? written['compilerOptions'] : undefined;

  if (!isRecord(options)) {
    throw new Error('the tsconfig the preset writes declares no compilerOptions');
  }

  return options;
}

async function mutationTestConfigItNames(): Promise<string> {
  const written: unknown = JSON.parse(
    await readFile(join(import.meta.dirname, '..', 'files', 'stryker.conf.json'), 'utf8'),
  );
  const runner = isRecord(written) ? written['vitest'] : undefined;
  const named = isRecord(runner) ? runner['configFile'] : undefined;

  if (typeof named !== 'string') {
    throw new Error('the mutation config the preset writes names no test config');
  }

  return named;
}

async function lintPluginsItWrites(): Promise<string[]> {
  const written: unknown = JSON.parse(
    await readFile(join(import.meta.dirname, '..', 'files', 'oxlintrc.json'), 'utf8'),
  );
  const declared = isRecord(written) ? written['jsPlugins'] : undefined;

  if (!Array.isArray(declared)) {
    return [];
  }

  return declared
    .map((plugin: unknown) => (isRecord(plugin) ? plugin['specifier'] : undefined))
    .filter((specifier): specifier is string => typeof specifier === 'string');
}

async function commitJobsItWrites(): Promise<string[]> {
  const written = await readFile(join(import.meta.dirname, '..', 'files', 'lefthook.yml'), 'utf8');
  const upToCommitMsg = written.slice(0, written.indexOf('commit-msg:'));

  return [...upToCommitMsg.matchAll(/- name: (\S+)/g)].map(([, job]) => job ?? '');
}

function namedPackages(options: Record<string, unknown>): string[] {
  const source = options['jsxImportSource'];
  const types = options['types'];

  return [...(typeof source === 'string' ? [source] : []), ...(isStringArray(types) ? types : [])];
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

describe('the tests the cli preset ships', () => {
  it('names every test it ships the way its own semantics declares', () => {
    const shipped = CLI_PRESET.files
      .map((file) => basename(file.target))
      .filter((name) => name.endsWith('.test.ts'));

    expect(shipped.length).toBeGreaterThan(0);

    for (const name of shipped) {
      const unit = name.slice(0, name.indexOf('.'));
      const declared = [
        testFileFor(CLI_SEMANTICS.tests.example, unit),
        testFileFor(CLI_SEMANTICS.tests.property, unit),
      ];

      expect({ name, declared: declared.includes(name) }).toStrictEqual({ name, declared: true });
    }
  });

  it('ships a property suite beside the example suite, since one preset teaches both', () => {
    const shipped = CLI_PRESET.files.map((file) => basename(file.target));

    expect(shipped.some((name) => name.endsWith('.property.test.ts'))).toBe(true);
  });

  it('names the preset ket resolves it by', () => {
    expect(CLI_PRESET.name).toBe('ket-cli');
  });
});

describe('the gate chain the cli preset arms at commit time', () => {
  it('names a job the shipped hook file actually runs', async () => {
    const jobs = await commitJobsItWrites();

    for (const gate of CLI_SEMANTICS.gates.filter((candidate) => candidate.commitJob !== '')) {
      expect({ job: gate.commitJob, runs: jobs.includes(gate.commitJob) }).toStrictEqual({
        job: gate.commitJob,
        runs: true,
      });
    }
  });

  it('claims every job the hook file runs, so no gate hides from the chain', async () => {
    const claimed = new Set(CLI_SEMANTICS.gates.map((gate) => gate.commitJob));
    const unclaimed = (await commitJobsItWrites()).filter(
      (job) => job !== 'protect-main' && !claimed.has(job),
    );

    expect(unclaimed).toStrictEqual([]);
  });
});
