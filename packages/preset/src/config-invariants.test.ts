import { describe, expect, it } from 'vitest';

import type { PresetContents } from './contents.ts';
import type { PresetItem } from './item.ts';

import { configInvariantsOf } from './config-invariants.ts';
import { writes } from './item.ts';

const ITEM: PresetItem = {
  $schema: 'https://ui.shadcn.com/schema/registry-item.json',
  name: 'ket-example',
  type: 'registry:item',
  title: 'ket example',
  description: 'A preset written to be read by a test.',
  dependencies: [],
  devDependencies: ['@types/bun@1.3.14', '@stylistic/eslint-plugin@5.10.0'],
  files: [
    writes('tsconfig.json', 'tsconfig.json'),
    writes('oxlintrc.json', '.oxlintrc.json'),
    writes('vale.ini', '.vale.ini'),
    writes('vale-styles/NoEmDash.yml', '.vale/styles/ket/NoEmDash.yml'),
    writes('vale-vocabulary/accept.txt', '.vale/styles/config/vocabularies/ket/accept.txt'),
    writes('stryker.conf.json', 'stryker.conf.json'),
    writes('vitest.mutation.config.ts', 'vitest.mutation.config.ts'),
  ],
  integrations: [],
};

const PROSE =
  'StylesPath = .vale/styles\nVocab = ket\n\n[*.md]\nBasedOnStyles = Vale, Microsoft, ket\n';

const SHIPPED: PresetContents = {
  'files/tsconfig.json': JSON.stringify({ compilerOptions: { types: ['bun'] } }),
  'files/oxlintrc.json': JSON.stringify({
    jsPlugins: [{ name: '@stylistic', specifier: '@stylistic/eslint-plugin' }],
  }),
  'files/vale.ini': PROSE,
  'files/vale-styles/NoEmDash.yml': 'extends: existence\n',
  'files/vale-vocabulary/accept.txt': 'ket\n',
  'files/stryker.conf.json': JSON.stringify({
    vitest: { configFile: 'vitest.mutation.config.ts' },
  }),
  'files/vitest.mutation.config.ts': 'export default {};\n',
};

function invariantsWhenWriting(path: string, written: string): string[] {
  return configInvariantsOf(ITEM, { ...SHIPPED, [path]: written });
}

describe('the packages a preset installs against the configs it writes', () => {
  it('breaks nothing when every config names only what the preset ships', () => {
    expect(configInvariantsOf(ITEM, SHIPPED)).toStrictEqual([]);
  });

  it('names a package the tsconfig asks for and the preset installs nowhere', () => {
    const written = JSON.stringify({ compilerOptions: { types: ['bun', 'node'] } });

    expect(invariantsWhenWriting('files/tsconfig.json', written)).toStrictEqual([
      'the tsconfig the preset writes names node, which the preset installs nowhere',
    ]);
  });

  it('counts a package installed under the types scope as installed', () => {
    const written = JSON.stringify({ compilerOptions: { jsxImportSource: 'bun' } });

    expect(invariantsWhenWriting('files/tsconfig.json', written)).toStrictEqual([]);
  });

  it('names a renderer the tsconfig points jsx at and the preset installs nowhere', () => {
    const written = JSON.stringify({ compilerOptions: { jsxImportSource: '@opentui/react' } });

    expect(invariantsWhenWriting('files/tsconfig.json', written)).toStrictEqual([
      'the tsconfig the preset writes names @opentui/react, which the preset installs nowhere',
    ]);
  });

  it('says nothing about a tsconfig the preset never writes', () => {
    const item = { ...ITEM, files: ITEM.files.filter((file) => file.target !== '~/tsconfig.json') };

    expect(configInvariantsOf(item, SHIPPED)).toStrictEqual([]);
  });

  it('names a plugin the lint config asks for and the preset installs nowhere', () => {
    const written = JSON.stringify({ jsPlugins: [{ specifier: 'eslint-plugin-import' }] });

    expect(invariantsWhenWriting('files/oxlintrc.json', written)).toStrictEqual([
      'the lint config the preset writes names the plugin eslint-plugin-import, which the preset installs nowhere',
    ]);
  });

  it('says nothing about a lint config that loads no plugin', () => {
    expect(invariantsWhenWriting('files/oxlintrc.json', JSON.stringify({}))).toStrictEqual([]);
  });

  it('reads no plugin out of a lint config entry that names no specifier', () => {
    const written = JSON.stringify({
      jsPlugins: [{ name: '@stylistic' }, { specifier: '@stylistic/eslint-plugin' }],
    });

    expect(invariantsWhenWriting('files/oxlintrc.json', written)).toStrictEqual([]);
  });

  it('reads no package out of a tsconfig whose types are not all names', () => {
    const written = JSON.stringify({ compilerOptions: { types: ['bun', 42] } });

    expect(invariantsWhenWriting('files/tsconfig.json', written)).toStrictEqual([]);
  });

  it('reads no package out of a config that holds no object at all', () => {
    expect(invariantsWhenWriting('files/tsconfig.json', 'null')).toStrictEqual([]);
  });
});

describe('a config that reaches into a package rather than naming it', () => {
  function invariantsWhenInstalling(installed: string[], written: string): string[] {
    const item = { ...ITEM, devDependencies: [...ITEM.devDependencies, ...installed] };

    return configInvariantsOf(item, { ...SHIPPED, 'files/tsconfig.json': written });
  }

  it('counts a package the tsconfig reaches into by subpath as installed', () => {
    const written = JSON.stringify({ compilerOptions: { types: ['vite/client'] } });

    expect(invariantsWhenInstalling(['vite@8.2.0'], written)).toStrictEqual([]);
  });

  it('names the whole subpath when the package behind it is installed nowhere', () => {
    const written = JSON.stringify({ compilerOptions: { types: ['vite/client'] } });

    expect(invariantsWhenInstalling([], written)).toStrictEqual([
      'the tsconfig the preset writes names vite/client, which the preset installs nowhere',
    ]);
  });

  it('counts a scoped package reached into by subpath as installed', () => {
    const written = JSON.stringify({
      compilerOptions: { jsxImportSource: '@tanstack/react-start/config' },
    });

    expect(invariantsWhenInstalling(['@tanstack/react-start@1.168.34'], written)).toStrictEqual([]);
  });

  it('reads a scope as no package at all, since a scope installs nothing', () => {
    const written = JSON.stringify({ compilerOptions: { types: ['@tanstack'] } });

    expect(invariantsWhenInstalling(['@tanstack/react-start@1.168.34'], written)).toStrictEqual([
      'the tsconfig the preset writes names @tanstack, which the preset installs nowhere',
    ]);
  });
});

describe('the mutation config a preset writes against the test config it ships', () => {
  it('names a test config the mutation config points at and the preset ships nowhere', () => {
    const written = JSON.stringify({ vitest: { configFile: 'vitest.elsewhere.config.ts' } });

    expect(invariantsWhenWriting('files/stryker.conf.json', written)).toStrictEqual([
      'the mutation config the preset writes names vitest.elsewhere.config.ts, which the preset ships nowhere',
    ]);
  });

  it('names a mutation config that points at no test config at all', () => {
    expect(invariantsWhenWriting('files/stryker.conf.json', JSON.stringify({}))).toStrictEqual([
      'the mutation config the preset writes names no test config',
    ]);
  });

  it('names a mutation config whose runner section holds no file name', () => {
    const written = JSON.stringify({ vitest: { configFile: 42 } });

    expect(invariantsWhenWriting('files/stryker.conf.json', written)).toStrictEqual([
      'the mutation config the preset writes names no test config',
    ]);
  });
});

describe('what a preset ships as source against what it installs', () => {
  const SOURCE =
    "import { createRouter } from '@tanstack/react-router';\nimport { join } from 'node:path';\nimport { greeting } from './model/greeting.ts';\n";

  function invariantsShipping(installed: string[], source: string): string[] {
    const item = {
      ...ITEM,
      dependencies: installed,
      files: [...ITEM.files, writes('source/router.tsx', 'src/app/router.tsx')],
    };

    return configInvariantsOf(item, { ...SHIPPED, 'files/source/router.tsx': source });
  }

  it('breaks nothing when the preset installs every package its source imports', () => {
    expect(invariantsShipping(['@tanstack/react-router@1.170.18'], SOURCE)).toStrictEqual([]);
  });

  it('names a package the source imports and the preset installs nowhere', () => {
    expect(invariantsShipping([], SOURCE)).toStrictEqual([
      'the source the preset ships imports @tanstack/react-router, which the preset installs nowhere',
    ]);
  });

  it('reads no package out of a relative import, since that is the preset itself', () => {
    expect(
      invariantsShipping([], "import { greeting } from './model/greeting.ts';\n"),
    ).toStrictEqual([]);
  });

  it('reads no import out of a file the preset ships as anything but source', () => {
    const item = { ...ITEM, dependencies: [] };
    const shipped = { ...SHIPPED, 'files/vale-styles/NoEmDash.yml': "from 'react'" };

    expect(configInvariantsOf(item, shipped)).toStrictEqual([]);
  });

  it('reads no import out of a source file whose bytes the preset carries nowhere', () => {
    const item = {
      ...ITEM,
      dependencies: [],
      files: [...ITEM.files, writes('source/router.tsx', 'src/app/router.tsx')],
    };

    expect(configInvariantsOf(item, SHIPPED)).toStrictEqual([]);
  });

  it('reads no package out of a path the project aliases to its own source', () => {
    expect(invariantsShipping([], "import { cn } from '@/shared/cn.ts';\n")).toStrictEqual([]);
  });

  it('reads no package out of a runtime builtin', () => {
    expect(invariantsShipping([], "import { join } from 'node:path';\n")).toStrictEqual([]);
  });

  it('reads the package behind a subpath the source reaches into', () => {
    const source = "import { tanstackStart } from '@tanstack/react-start/plugin/vite';\n";

    expect(invariantsShipping(['@tanstack/react-start@1.168.34'], source)).toStrictEqual([]);
  });
});
