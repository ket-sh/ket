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
  devDependencies: [],
  files: [
    writes('vale.ini', '.vale.ini'),
    writes('vale.core.ini', '.vale.core.ini'),
    writes('vale-styles/NoEmDash.yml', '.vale/styles/ket/NoEmDash.yml'),
    writes('vale-vocabulary/accept.txt', '.vale/styles/config/vocabularies/ket/accept.txt'),
  ],
  integrations: [],
};

const PROSE =
  'StylesPath = .vale/styles\nVocab = ket\n\n[*.md]\nBasedOnStyles = Vale, Microsoft, ket\n';

const CORE_PROSE =
  'StylesPath = .vale/styles\nVocab = ket\n\n[*.md]\nBasedOnStyles = Vale, ket\n\n[CLAUDE.md]\nBasedOnStyles = Vale, Microsoft, ket\n';

const SHIPPED: PresetContents = {
  'files/vale.ini': PROSE,
  'files/vale.core.ini': CORE_PROSE,
  'files/vale-styles/NoEmDash.yml': 'extends: existence\n',
  'files/vale-vocabulary/accept.txt': 'ket\n',
};

function invariantsWhenWriting(path: string, written: string): string[] {
  return configInvariantsOf(ITEM, { ...SHIPPED, [path]: written });
}

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

describe('the core prose config a preset writes beside the full one', () => {
  it('holds the core config to the same law as the full one', () => {
    const written = CORE_PROSE.replace('Vale, ket', 'Vale, ket, house');

    expect(invariantsWhenWriting('files/vale.core.ini', written)).toStrictEqual([
      'the prose config the preset writes names the style house, which the preset ships nowhere',
    ]);
  });

  it('reads every section, so a later override answers to the same law', () => {
    const written = CORE_PROSE.replace('Vale, Microsoft, ket', 'Vale, Microsoft, ket, house');

    expect(invariantsWhenWriting('files/vale.core.ini', written)).toStrictEqual([
      'the prose config the preset writes names the style house, which the preset ships nowhere',
    ]);
  });

  it('demands a vocabulary of the core config too', () => {
    const written = CORE_PROSE.replace('Vocab = ket\n', '');

    expect(invariantsWhenWriting('files/vale.core.ini', written)).toStrictEqual([
      'the prose config the preset writes names no vocabulary',
    ]);
  });
});
