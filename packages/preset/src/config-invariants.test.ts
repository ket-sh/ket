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

describe('the prose config a preset writes against the styles it ships', () => {
  it('names a style the prose config asks for and the preset ships nowhere', () => {
    const written = PROSE.replace('Microsoft, ket', 'Microsoft, ket, house');

    expect(invariantsWhenWriting('files/vale.ini', written)).toStrictEqual([
      'the prose config the preset writes names the style house, which the preset ships nowhere',
    ]);
  });

  it('asks for no file for the styles the prose tool supplies itself', () => {
    const written = PROSE.replace('Vale, Microsoft, ket', 'Vale, Microsoft');

    expect(invariantsWhenWriting('files/vale.ini', written)).toStrictEqual([]);
  });

  it('names a prose config that declares no vocabulary at all', () => {
    const written = PROSE.replace('Vocab = ket\n', '');

    expect(invariantsWhenWriting('files/vale.ini', written)).toStrictEqual([
      'the prose config the preset writes names no vocabulary',
    ]);
  });

  it('names a vocabulary the prose config asks for and the preset ships nowhere', () => {
    const written = PROSE.replace('Vocab = ket', 'Vocab = house');

    expect(invariantsWhenWriting('files/vale.ini', written)).toStrictEqual([
      'the prose config the preset writes names the vocabulary house, which the preset ships nowhere',
    ]);
  });

  it('names a prose config that leaves its vocabulary blank', () => {
    const written = PROSE.replace('Vocab = ket', 'Vocab =');

    expect(invariantsWhenWriting('files/vale.ini', written)).toStrictEqual([
      'the prose config the preset writes names no vocabulary',
    ]);
  });

  it('asks for no file for a style list that ends on a comma', () => {
    const written = PROSE.replace('Microsoft, ket', 'Microsoft, ket,');

    expect(invariantsWhenWriting('files/vale.ini', written)).toStrictEqual([]);
  });

  it('asks for no file when the prose config bases itself on no style at all', () => {
    const written = PROSE.replace('BasedOnStyles = Vale, Microsoft, ket\n', '');

    expect(invariantsWhenWriting('files/vale.ini', written)).toStrictEqual([]);
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
