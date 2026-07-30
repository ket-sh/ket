import { access, readFile } from 'node:fs/promises';
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

async function readsPresetFile(name: string): Promise<string> {
  return readFile(join(import.meta.dirname, '..', 'files', name), 'utf8');
}

async function commitJobsItWrites(): Promise<string[]> {
  const written = await readsPresetFile('lefthook.yml');
  const upToCommitMsg = written.slice(0, written.indexOf('commit-msg:'));

  return [...upToCommitMsg.matchAll(/- name: (\S+)/g)].map(([, job]) => job ?? '');
}

function isBarePackage(specifier: string): boolean {
  return !specifier.startsWith('.') && !specifier.startsWith('node:');
}

async function packagesTheSourceImports(): Promise<string[]> {
  const shipped = CLI_PRESET.files.filter((file) => file.path.startsWith('files/source/'));
  const sources = await Promise.all(
    shipped.map(async (file) => readFile(join(import.meta.dirname, '..', file.path), 'utf8')),
  );

  return [
    ...new Set(
      sources
        .flatMap((source) => [...source.matchAll(/from '([^']+)'/g)])
        .map(([, specifier]) => specifier ?? '')
        .filter(isBarePackage),
    ),
  ];
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

describe('the registry shape the cli preset conforms to', () => {
  it('names the schema a registry consumer validates against', () => {
    expect(CLI_PRESET.$schema).toBe('https://ui.shadcn.com/schema/registry-item.json');
  });

  it('declares itself an item, since a consumer resolves by that type', () => {
    expect(CLI_PRESET.type).toBe('registry:item');
  });

  it('declares every entry a file, since none of them is a component', () => {
    for (const file of CLI_PRESET.files) {
      expect({ path: file.path, type: file.type }).toStrictEqual({
        path: file.path,
        type: 'registry:file',
      });
    }
  });

  it('introduces itself, since a listing shows the title and the description', () => {
    expect(CLI_PRESET.title.length).toBeGreaterThan(0);
    expect(CLI_PRESET.description.length).toBeGreaterThan(0);
  });

  it('targets a real path under the repository, not the repository itself', () => {
    for (const file of CLI_PRESET.files) {
      expect({ path: file.path, under: file.target.slice(2) }).not.toStrictEqual({
        path: file.path,
        under: '',
      });
    }
  });

  it('reads every file it ships out of its own files directory', () => {
    for (const file of CLI_PRESET.files) {
      expect({ path: file.path, inside: file.path.startsWith('files/') }).toStrictEqual({
        path: file.path,
        inside: true,
      });
    }
  });
});

describe('what the source the cli preset ships needs to run', () => {
  it('declares every package that source imports', async () => {
    const declared = new Set(
      [...CLI_PRESET.dependencies, ...CLI_PRESET.devDependencies].map((pin) => splitPin(pin).name),
    );

    for (const imported of await packagesTheSourceImports()) {
      expect({ imported, declared: declared.has(imported) }).toStrictEqual({
        imported,
        declared: true,
      });
    }
  });

  it('imports something, since a command that imports nothing runs nothing', async () => {
    expect((await packagesTheSourceImports()).length).toBeGreaterThan(0);
  });
});
