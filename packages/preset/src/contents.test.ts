import { describe, expect, it } from 'vitest';

import type { PresetItem } from './item.ts';

import { contentReaderFor, writtenTo } from './contents.ts';
import { writes } from './item.ts';

const ITEM: PresetItem = {
  $schema: 'https://ui.shadcn.com/schema/registry-item.json',
  name: 'ket-example',
  type: 'registry:item',
  title: 'ket example',
  description: 'A preset written to be read by a test.',
  dependencies: [],
  devDependencies: [],
  files: [writes('knip.json', 'knip.json')],
  integrations: [],
};

describe('reading a file the preset carries', () => {
  it('answers the bytes it carries at that path', () => {
    const contentOf = contentReaderFor(ITEM, { 'files/knip.json': '{}\n' });

    expect(contentOf('files/knip.json')).toBe('{}\n');
  });

  it('answers an empty file as an empty string rather than as a miss', () => {
    const contentOf = contentReaderFor(ITEM, { 'files/knip.json': '' });

    expect(contentOf('files/knip.json')).toBe('');
  });

  it('refuses a path the preset never shipped, naming the preset and the path', () => {
    const contentOf = contentReaderFor(ITEM, { 'files/knip.json': '{}\n' });

    expect(() => contentOf('files/nowhere.json')).toThrow(
      'the ket-example preset promises files/nowhere.json but ships no such file',
    );
  });
});

describe('what the preset writes to a place in a project', () => {
  it('answers the bytes that land at the target the preset writes them to', () => {
    expect(writtenTo(ITEM, { 'files/knip.json': '{}\n' }, '~/knip.json')).toBe('{}\n');
  });

  it('answers nothing for a target the preset writes to no file', () => {
    expect(writtenTo(ITEM, { 'files/knip.json': '{}\n' }, '~/CLAUDE.md')).toBeUndefined();
  });

  it('answers nothing when the file the target names never shipped', () => {
    expect(writtenTo(ITEM, {}, '~/knip.json')).toBeUndefined();
  });
});
