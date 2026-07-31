import { describe, expect, it } from 'vitest';

import type { PresetContents } from './contents.ts';
import type { PresetItem } from './item.ts';
import type { PresetSemantics } from './semantics.ts';

import { writes } from './item.ts';
import { mutationScopeInvariantsOf } from './mutation-invariants.ts';

const ITEM: PresetItem = {
  $schema: 'https://ui.shadcn.com/schema/registry-item.json',
  name: 'ket-example',
  type: 'registry:item',
  title: 'ket example',
  description: 'A preset written to be read by a test.',
  dependencies: [],
  devDependencies: [],
  files: [writes('stryker.conf.json', 'stryker.conf.json')],
  integrations: [],
};

const SEMANTICS: PresetSemantics = {
  scripts: {},
  slice: {
    root: 'src/commands/{slice}',
    adapter: 'command.ts',
    mutate: ['**/*.ts', '!**/*.test.ts', '!command.ts', '!io/**'],
  },
  tests: { example: '{unit}.test.ts', property: '{unit}.property.test.ts' },
  acceptance: { runner: 'cucumber', drives: 'binary' },
  substrate: 'temporary-directories',
  lockfile: 'bun.lock',
  gates: [],
  rings: { formats: [], one: [], two: [] },
  testRuntime: 'vitest',
};

function shipping(mutate: string[]): PresetContents {
  return { 'files/stryker.conf.json': JSON.stringify({ mutate }) };
}

describe('the mutation config a preset writes against the adapters it declares', () => {
  it('says nothing when every declared adapter is excluded', () => {
    expect(
      mutationScopeInvariantsOf(
        ITEM,
        SEMANTICS,
        shipping(['src/**/*.ts', '!src/commands/*/command.ts', '!src/commands/*/io/**']),
      ),
    ).toStrictEqual([]);
  });

  it('names an adapter the config never excludes, since mutation would reach a boundary', () => {
    expect(
      mutationScopeInvariantsOf(
        ITEM,
        SEMANTICS,
        shipping(['src/**/*.ts', '!src/commands/*/command.ts']),
      ),
    ).toStrictEqual([
      'the preset declares src/commands/*/io/** an adapter, and the mutation config it writes never excludes it',
    ]);
  });

  it('names each adapter the config misses, not only the first', () => {
    expect(mutationScopeInvariantsOf(ITEM, SEMANTICS, shipping(['src/**/*.ts']))).toStrictEqual([
      'the preset declares src/commands/*/command.ts an adapter, and the mutation config it writes never excludes it',
      'the preset declares src/commands/*/io/** an adapter, and the mutation config it writes never excludes it',
    ]);
  });

  it('says nothing when the preset writes no mutation config at all', () => {
    expect(mutationScopeInvariantsOf({ ...ITEM, files: [] }, SEMANTICS, {})).toStrictEqual([]);
  });
});

describe('a mutation config whose shape is not the one expected', () => {
  it('says nothing when the config names no mutate list at all', () => {
    expect(mutationScopeInvariantsOf(ITEM, SEMANTICS, shipping([]))).toStrictEqual([
      'the preset declares src/commands/*/command.ts an adapter, and the mutation config it writes never excludes it',
      'the preset declares src/commands/*/io/** an adapter, and the mutation config it writes never excludes it',
    ]);
  });
});

describe('what counts as an exclusion', () => {
  it('reads a pattern without the mark as included, not excluded', () => {
    expect(
      mutationScopeInvariantsOf(ITEM, SEMANTICS, {
        'files/stryker.conf.json': JSON.stringify({
          mutate: ['src/commands/*/command.ts', '!src/commands/*/io/**'],
        }),
      }),
    ).toStrictEqual([
      'the preset declares src/commands/*/command.ts an adapter, and the mutation config it writes never excludes it',
    ]);
  });

  it('reads a config of nothing at all as excluding nothing', () => {
    expect(
      mutationScopeInvariantsOf(ITEM, SEMANTICS, { 'files/stryker.conf.json': 'null' }),
    ).toStrictEqual([
      'the preset declares src/commands/*/command.ts an adapter, and the mutation config it writes never excludes it',
      'the preset declares src/commands/*/io/** an adapter, and the mutation config it writes never excludes it',
    ]);
  });
});
