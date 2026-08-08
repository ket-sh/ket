import { describe, expect, it } from 'vitest';

import type { PresetIntegration, PresetItem } from './item.ts';
import type { PresetSemantics } from './semantics.ts';

import { declarationInvariantsOf } from './declaration-invariants.ts';
import { writes } from './item.ts';

const ITEM: PresetItem = {
  $schema: 'https://ui.shadcn.com/schema/registry-item.json',
  name: 'ket-example',
  type: 'registry:item',
  title: 'ket example',
  description: 'A preset written to be read by a test.',
  dependencies: ['citty@0.1.6'],
  devDependencies: ['oxlint@1.76.0', '@stylistic/eslint-plugin@5.10.0', 'cucumber@13.2.0'],
  files: [writes('lefthook.yml', 'lefthook.yml')],
  integrations: [],
};

const SEMANTICS: PresetSemantics = {
  scripts: {
    lint: 'oxlint .',
    'check-types': 'tsc --noEmit',
    test: 'vitest run',
    'test:mutation': 'stryker run',
  },
  slice: { roots: ['src/commands/{slice}'], adapters: ['command.ts'] },
  tests: { example: '{unit}.test.ts', property: '{unit}.property.test.ts' },
  acceptance: { runner: 'cucumber', drives: 'binary' },
  substrate: 'temporary-directories',
  lockfile: 'bun.lock',
  gates: [
    { script: 'lint', guards: 'It checks style.', commitJob: 'lint', ciJob: 'check' },
    { script: 'check-types', guards: 'It checks types.', commitJob: '', ciJob: 'check' },
    { script: 'test', guards: 'It checks behavior.', commitJob: '', ciJob: 'check' },
    { script: 'test:mutation', guards: 'It checks the suite.', commitJob: '', ciJob: 'mutation' },
  ],
  rings: {
    formats: [{ runs: 'oxfmt', scope: 'file' }],
    one: [{ runs: 'oxlint', scope: 'file' }],
    two: [{ runs: 'tsc --noEmit', scope: 'project' }],
  },
  testRuntime: 'vitest',
};

function brokenWhenItem(item: Partial<PresetItem>): string[] {
  return declarationInvariantsOf({ ...ITEM, ...item }, SEMANTICS);
}

describe('how a preset names and pins what it installs', () => {
  it('names a dependency left on a range rather than a pin', () => {
    expect(brokenWhenItem({ dependencies: ['citty@^0.1.6'] })).toContain(
      'the preset installs citty@^0.1.6, and a range moves a gate without a commit',
    );
  });

  it('names a dependency with no version at all', () => {
    expect(brokenWhenItem({ devDependencies: ['oxlint'] })).toContain(
      'the preset installs oxlint, and a range moves a gate without a commit',
    );
  });

  it('keeps a scoped package whole, since the scope is half its name', () => {
    expect(
      brokenWhenItem({
        devDependencies: [...ITEM.devDependencies, '@stylistic/eslint-plugin@5.10.0'],
      }),
    ).toStrictEqual([]);
  });

  it('names a scoped package with no version behind its scope', () => {
    expect(brokenWhenItem({ devDependencies: ['@stylistic/eslint-plugin'] })).toContain(
      'the preset installs @stylistic/eslint-plugin, and a range moves a gate without a commit',
    );
  });

  it('names a package pinned to nothing at all', () => {
    expect(brokenWhenItem({ devDependencies: ['oxlint@'] })).toContain(
      'the preset installs oxlint@, and a range moves a gate without a commit',
    );
  });

  it('names a preset ket could not resolve by name', () => {
    expect(brokenWhenItem({ name: 'example' })).toContain(
      'the preset calls itself example, and ket resolves a preset as ket-<target>',
    );
  });

  it('names a preset called nothing but the prefix ket resolves by', () => {
    expect(brokenWhenItem({ name: 'ket-' })).toContain(
      'the preset calls itself ket-, and ket resolves a preset as ket-<target>',
    );
  });

  it('names a preset that introduces itself with nothing', () => {
    expect(brokenWhenItem({ description: '' })).toContain(
      'the preset carries no description, and a listing shows one',
    );
  });

  it('names a preset that carries no title', () => {
    expect(brokenWhenItem({ title: '' })).toContain(
      'the preset carries no title, and a listing shows one',
    );
  });
});

describe('how a preset presents itself to a registry', () => {
  it('names a preset that declares no schema to validate against', () => {
    expect(brokenWhenItem({ $schema: '' })).toContain(
      'the preset declares no schema, and a registry validates an item against one',
    );
  });
});

describe('the runner a preset says answers for it', () => {
  it('breaks nothing when the preset installs the runner it names', () => {
    const semantics = { ...SEMANTICS, acceptance: { runner: 'cucumber', drives: 'binary' } };

    expect(declarationInvariantsOf(ITEM, semantics)).toStrictEqual([]);
  });

  it('names an acceptance runner the preset installs nowhere', () => {
    const item = {
      ...ITEM,
      devDependencies: ITEM.devDependencies.filter(
        (installed) => !installed.startsWith('cucumber'),
      ),
    };
    const semantics = { ...SEMANTICS, acceptance: { runner: 'cucumber', drives: 'binary' } };

    expect(declarationInvariantsOf(item, semantics)).toContain(
      'the preset says cucumber drives its acceptance, and installs no such package',
    );
  });

  it('reads a scoped runner as the package behind it', () => {
    const item = {
      ...ITEM,
      devDependencies: [...ITEM.devDependencies, '@cucumber/cucumber@13.2.0'],
    };
    const semantics = {
      ...SEMANTICS,
      acceptance: { runner: '@cucumber/cucumber', drives: 'binary' },
    };

    expect(declarationInvariantsOf(item, semantics)).toStrictEqual([]);
  });
});

describe('what an integration installs', () => {
  it('breaks nothing when an integration pins everything it installs', () => {
    const integrations: PresetIntegration[] = [
      {
        name: 'chromatic',
        category: 'visual review',
        asks: 'chromatic, on a public repository and a private one.',
        installs: ['chromatic@18.1.0'],
        files: [writes('github-chromatic.yml', '.github/workflows/chromatic.yml')],
      },
    ];

    expect(brokenWhenItem({ integrations })).toStrictEqual([]);
  });

  it('names a package an integration installs on a range rather than a pin', () => {
    const integrations: PresetIntegration[] = [
      {
        name: 'chromatic',
        category: 'visual review',
        asks: 'chromatic, on a public repository and a private one.',
        installs: ['chromatic@^18.1.0'],
        files: [writes('github-chromatic.yml', '.github/workflows/chromatic.yml')],
      },
    ];

    expect(brokenWhenItem({ integrations })).toContain(
      'the integration chromatic installs chromatic@^18.1.0, and a range moves a gate without a commit',
    );
  });
});

describe('where a preset targets what it writes', () => {
  it('names a file targeted outside the repository it configures', () => {
    const files = [
      { path: 'files/lefthook.yml', type: 'registry:file' as const, target: 'lefthook.yml' },
    ];

    expect(brokenWhenItem({ files })).toContain(
      'the preset targets lefthook.yml, and a target is written under ~/',
    );
  });

  it('names a file that targets the repository itself', () => {
    const files = [{ path: 'files/lefthook.yml', type: 'registry:file' as const, target: '~/' }];

    expect(brokenWhenItem({ files })).toContain(
      'the preset targets ~/, which is the repository rather than a file in it',
    );
  });

  it('names a file read from outside the directory the preset ships', () => {
    const files = [
      { path: 'lefthook.yml', type: 'registry:file' as const, target: '~/lefthook.yml' },
    ];

    expect(brokenWhenItem({ files })).toContain(
      'the preset ships lefthook.yml, and a preset reads what it ships out of files/',
    );
  });

  it('names two files written to one target, since one of them never arrives', () => {
    const files = [writes('lefthook.yml', 'lefthook.yml'), writes('hooks.yml', 'lefthook.yml')];

    expect(brokenWhenItem({ files })).toContain(
      'the preset writes two files to ~/lefthook.yml, so one of them never arrives',
    );
  });
});
