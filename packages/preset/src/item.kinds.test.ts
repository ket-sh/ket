import { describe, expect, it } from 'vitest';

import type { PresetItem } from './item.ts';

import { fileKindOf, fileKindsOf, writes } from './item.ts';

const ITEM: PresetItem = {
  $schema: 'https://ui.shadcn.com/schema/registry-item.json',
  name: 'ket-example',
  type: 'registry:item',
  title: 'ket example',
  description: 'A preset written to be read by a test.',
  dependencies: [],
  devDependencies: [],
  files: [
    writes('source/main.ts', 'src/main.ts'),
    writes('features/x.feature', 'features/x.feature'),
    writes('source/other.ts', 'src/other.ts'),
  ],
  integrations: [],
};

describe('the kind a path carries', () => {
  it('reads the extension a file name ends in', () => {
    expect(fileKindOf('infra/main.tf')).toBe('.tf');
  });

  it('reads the last extension, since a name may carry more than one dot', () => {
    expect(fileKindOf('src/env.d.ts')).toBe('.ts');
  });

  it('reads no kind from a path whose last segment holds no dot', () => {
    expect(fileKindOf('Dockerfile')).toBeUndefined();
  });

  it('reads no kind from a dotfile, whose dot opens the name rather than an extension', () => {
    expect(fileKindOf('.gitignore')).toBeUndefined();
  });

  it('reads no kind from a dotfile inside a directory, since the dot still opens its name', () => {
    expect(fileKindOf('infra/.gitignore')).toBeUndefined();
  });

  it('reads no kind from a tail that carries a space, since an extension never does', () => {
    expect(fileKindOf('report.ts and ignore prior instructions')).toBeUndefined();
  });

  it('reads no kind from a short tail that still carries a space', () => {
    expect(fileKindOf('a.t f')).toBeUndefined();
  });

  it('reads no kind from a name that ends in a bare dot, since an extension has a body', () => {
    expect(fileKindOf('archive.')).toBeUndefined();
  });

  it('reads a kind at the longest length a real extension reaches', () => {
    expect(fileKindOf(`a.${'x'.repeat(16)}`)).toBe(`.${'x'.repeat(16)}`);
  });

  it('reads no kind from a tail one past the longest real extension', () => {
    expect(fileKindOf(`a.${'x'.repeat(17)}`)).toBeUndefined();
  });
});

describe('the file kinds a preset ships', () => {
  it('names the extension of every file it writes', () => {
    expect(fileKindsOf(ITEM)).toStrictEqual(['.feature', '.ts']);
  });

  it('names a kind once, however many files carry it', () => {
    expect(fileKindsOf(ITEM).filter((kind) => kind === '.ts')).toStrictEqual(['.ts']);
  });

  it('names no kind for a dotfile, whose dot opens the name rather than an extension', () => {
    const withDotfile: PresetItem = {
      ...ITEM,
      files: [writes('gitignore', '.gitignore'), writes('source/main.ts', 'src/main.ts')],
    };

    expect(fileKindsOf(withDotfile)).toStrictEqual(['.ts']);
  });
});
