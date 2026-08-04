import { describe, expect, it } from 'vitest';

import type { PresetItem } from './item.ts';

import { fileKindsOf, writes } from './item.ts';

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
