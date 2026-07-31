import { describe, expect, it } from 'vitest';

import type { PresetItem } from './item.ts';

import { contentInvariantsOf } from './contents-invariants.ts';
import { writes } from './item.ts';

function itemPromising(files: PresetItem['files']): PresetItem {
  return {
    $schema: 'https://ui.shadcn.com/schema/registry-item.json',
    name: 'ket-example',
    type: 'registry:item',
    title: 'ket example',
    description: 'A preset written to be read by a test.',
    dependencies: [],
    devDependencies: [],
    files,
    integrations: [],
  };
}

const ITEM = itemPromising([writes('knip.json', 'knip.json')]);

describe('what a preset carries against what it promises', () => {
  it('breaks nothing when it carries every promised file as the disk holds it', () => {
    expect(
      contentInvariantsOf(ITEM, { 'files/knip.json': '{}\n' }, { 'files/knip.json': '{}\n' }),
    ).toStrictEqual([]);
  });

  it('names a promised file it carries nothing for', () => {
    expect(contentInvariantsOf(ITEM, {}, { 'files/knip.json': '{}\n' })).toStrictEqual([
      'the preset promises files/knip.json but carries no such file',
    ]);
  });

  it('names a file it carries that it never promised', () => {
    const carried = { 'files/knip.json': '{}\n', 'files/stray.json': 'null\n' };

    expect(contentInvariantsOf(ITEM, carried, carried)).toStrictEqual([
      'the preset carries files/stray.json but promises no such file',
    ]);
  });

  it('names a file whose carried bytes drifted from the file on disk', () => {
    expect(
      contentInvariantsOf(ITEM, { 'files/knip.json': '{}\n' }, { 'files/knip.json': '{ }\n' }),
    ).toStrictEqual([
      'the preset carries files/knip.json as bytes the file on disk no longer holds',
    ]);
  });

  it('names a file it carries that no longer sits on disk', () => {
    expect(contentInvariantsOf(ITEM, { 'files/knip.json': '{}\n' }, {})).toStrictEqual([
      'the preset carries files/knip.json as bytes the file on disk no longer holds',
    ]);
  });

  it('says nothing about drift for a file it carries nothing for', () => {
    expect(contentInvariantsOf(ITEM, {}, {})).toStrictEqual([
      'the preset promises files/knip.json but carries no such file',
    ]);
  });

  it('reads the files an integration promises as well as the ones it always writes', () => {
    const item = {
      ...ITEM,
      integrations: [
        { name: 'codecov', asks: 'codecov?', files: [writes('coverage.yml', 'coverage.yml')] },
      ],
    };

    expect(contentInvariantsOf(item, { 'files/knip.json': '{}\n' }, {})).toContain(
      'the preset promises files/coverage.yml but carries no such file',
    );
  });
});
