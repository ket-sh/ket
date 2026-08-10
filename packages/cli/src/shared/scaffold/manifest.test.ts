import { describe, expect, it } from 'vitest';

import type { Configuration } from '../configuration.ts';
import type { ScaffoldFile } from '../write-files.ts';
import type { ManifestSource } from './manifest.ts';

import { MANIFEST_FILE, manifestFileOf, manifestSourceFor, renderManifest } from './manifest.ts';

const PRESET: ManifestSource = {
  dependencies: ['citty@0.2.2'],
  devDependencies: ['oxlint@1.76.0', 'vitest@4.1.10'],
  scripts: { test: 'vitest run', lint: 'oxlint .' },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function namesUnder(rendered: string, field: string): string[] {
  const manifest: unknown = JSON.parse(rendered);
  const section = isRecord(manifest) ? manifest[field] : undefined;

  return isRecord(section) ? Object.keys(section) : [];
}

function parsed(file: ScaffoldFile | { refused: string } | undefined): unknown {
  if (file === undefined) {
    throw new Error('nothing was merged to parse');
  }

  if ('refused' in file) {
    throw new Error(file.refused);
  }

  return JSON.parse(file.contents);
}

function mergedFile(file: ScaffoldFile | { refused: string } | undefined): ScaffoldFile {
  if (file === undefined || 'refused' in file) {
    throw new Error('nothing was merged');
  }

  return file;
}

function governedBy(
  preset: Configuration['targets'][string],
  integrations: string[],
): Configuration {
  return {
    key: 'ORD',
    targets: { '.': preset },
    integrations,
    language: 'en',
    workflow: true,
  };
}

describe('rendering the manifest a project starts from', () => {
  it('names the package after the directory it was created in', () => {
    const manifest: unknown = JSON.parse(renderManifest('order-service', PRESET));

    expect(manifest).toMatchObject({ name: 'order-service' });
  });

  it('splits a pin into a name and a range the manifest understands', () => {
    const manifest: unknown = JSON.parse(renderManifest('app', PRESET));

    expect(manifest).toMatchObject({
      dependencies: { citty: '0.2.2' },
      devDependencies: { oxlint: '1.76.0', vitest: '4.1.10' },
    });
  });

  it('keeps a scoped package whole, since its name carries an at sign of its own', () => {
    const manifest: unknown = JSON.parse(
      renderManifest('app', { ...PRESET, devDependencies: ['@types/bun@1.3.14'] }),
    );

    expect(manifest).toMatchObject({ devDependencies: { '@types/bun': '1.3.14' } });
  });

  it('carries the scripts the preset declares', () => {
    const manifest: unknown = JSON.parse(renderManifest('app', PRESET));

    expect(manifest).toMatchObject({ scripts: { test: 'vitest run', lint: 'oxlint .' } });
  });

  it('declares modules, since ket scaffolds nothing that is not one', () => {
    const manifest: unknown = JSON.parse(renderManifest('app', PRESET));

    expect(manifest).toMatchObject({ type: 'module' });
  });

  it('declares the bun floor a project needs to watch its own board', () => {
    const manifest: unknown = JSON.parse(renderManifest('app', PRESET));

    expect(manifest).toMatchObject({ engines: { bun: '>=1.3.14' } });
  });

  it('ends with a newline, so a formatter leaves it alone', () => {
    expect(renderManifest('app', PRESET).endsWith('}\n')).toBe(true);
  });
});

describe('the order the manifest lists things in', () => {
  it('sorts dependencies by name, the order a formatter settles on', () => {
    const rendered = renderManifest('my-app', {
      dependencies: ['zod@4.0.0', 'citty@0.2.2'],
      devDependencies: ['vitest@4.1.10', '@types/bun@1.3.14', 'oxlint@1.76.0'],
      scripts: {},
    });

    expect(namesUnder(rendered, 'dependencies')).toStrictEqual(['citty', 'zod']);
    expect(namesUnder(rendered, 'devDependencies')).toStrictEqual([
      '@types/bun',
      'oxlint',
      'vitest',
    ]);
  });

  it('leaves the scripts in the order the preset declares them', () => {
    const rendered = renderManifest('my-app', {
      dependencies: [],
      devDependencies: [],
      scripts: { build: 'a', test: 'b', lint: 'c' },
    });

    expect(namesUnder(rendered, 'scripts')).toStrictEqual(['build', 'test', 'lint']);
  });
});

describe('what a manifest declares for a configuration', () => {
  it('carries the pins a chosen integration brings', () => {
    expect(manifestSourceFor(governedBy('web', ['chromatic'])).devDependencies).toContain(
      'chromatic@18.1.0',
    );
  });

  it('carries the dictionary the documentation language asks for', () => {
    expect(
      manifestSourceFor({ ...governedBy('web', []), language: 'tr' }).devDependencies,
    ).toContain('@cspell/dict-tr-tr@3.0.6');
  });

  it('carries the scripts the governing preset declares', () => {
    expect(Object.keys(manifestSourceFor(governedBy('cli', [])).scripts)).toContain('test');
  });

  it('declares nothing shipped for a target ket writes no preset for', () => {
    const source = manifestSourceFor(governedBy('api', []));

    expect(source).toStrictEqual({ dependencies: [], devDependencies: [], scripts: {} });
  });
});

describe('merging what a project is missing into the manifest it holds', () => {
  const held = JSON.stringify({
    name: 'order-service',
    type: 'module',
    scripts: { test: 'vitest run' },
    dependencies: {},
    devDependencies: { oxlint: '1.76.0' },
    engines: { bun: '>=1.3.14' },
  });

  it('adds the pin the project is missing', () => {
    expect(parsed(manifestFileOf(held, 'order-service', PRESET))).toMatchObject({
      devDependencies: { oxlint: '1.76.0', vitest: '4.1.10' },
    });
  });

  it('adds the dependency the project never had', () => {
    expect(parsed(manifestFileOf(held, 'order-service', PRESET))).toMatchObject({
      dependencies: { citty: '0.2.2' },
    });
  });

  it('adds the script the project never had', () => {
    expect(parsed(manifestFileOf(held, 'order-service', PRESET))).toMatchObject({
      scripts: { test: 'vitest run', lint: 'oxlint .' },
    });
  });

  it('lands where a package manager reads what a project depends on', () => {
    expect(mergedFile(manifestFileOf(held, 'order-service', PRESET)).path).toBe(MANIFEST_FILE);
  });

  it('ends with a newline, so a formatter leaves it alone', () => {
    expect(mergedFile(manifestFileOf(held, 'order-service', PRESET)).contents.endsWith('\n')).toBe(
      true,
    );
  });
});

describe('merging into a manifest the project made its own', () => {
  it('keeps the version the project pinned rather than the one the preset ships', () => {
    const held = JSON.stringify({ devDependencies: { oxlint: '1.0.0' } });

    expect(parsed(manifestFileOf(held, 'app', PRESET))).toMatchObject({
      devDependencies: { oxlint: '1.0.0', vitest: '4.1.10' },
    });
  });

  it('keeps the script the project rewrote', () => {
    const held = JSON.stringify({ scripts: { test: 'bun test' } });

    expect(parsed(manifestFileOf(held, 'app', PRESET))).toMatchObject({
      scripts: { test: 'bun test', lint: 'oxlint .' },
    });
  });

  it('keeps the name the project chose rather than the directory it sits in', () => {
    const held = JSON.stringify({ name: '@acme/orders' });

    expect(parsed(manifestFileOf(held, 'order-service', PRESET))).toMatchObject({
      name: '@acme/orders',
    });
  });

  it('keeps every field beside the ones ket declares', () => {
    const held = JSON.stringify({ private: true, workspaces: ['apps/*'] });

    expect(parsed(manifestFileOf(held, 'app', PRESET))).toMatchObject({
      private: true,
      workspaces: ['apps/*'],
    });
  });
});

describe('a manifest that already holds everything', () => {
  it('writes nothing, leaving the file the project formatted alone', () => {
    const held = renderManifest('app', PRESET);

    expect(manifestFileOf(held, 'app', PRESET)).toBeUndefined();
  });

  it('writes nothing when a configuration declares nothing to add', () => {
    const empty: ManifestSource = { dependencies: [], devDependencies: [], scripts: {} };
    const held = renderManifest('app', empty);

    expect(manifestFileOf(held, 'app', empty)).toBeUndefined();
  });
});

describe('a manifest left in no state to merge', () => {
  it('refuses a file it cannot read and merges nothing, since a rewrite would drop what the project holds', () => {
    expect(manifestFileOf('{ not json', 'app', PRESET)).toStrictEqual({
      refused: 'package.json cannot be read, so nothing merges into it',
    });
  });

  it('refuses a file that holds no record', () => {
    expect(manifestFileOf('null', 'app', PRESET)).toStrictEqual({
      refused: 'package.json holds no record, so nothing merges into it',
    });
  });

  it('refuses a block that is not a block of pins, naming the block', () => {
    const held = JSON.stringify({ devDependencies: ['oxlint'] });

    expect(manifestFileOf(held, 'app', PRESET)).toStrictEqual({
      refused: 'package.json holds devDependencies in no state to merge, so nothing merges into it',
    });
  });
});
