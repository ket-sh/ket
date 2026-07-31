import { describe, expect, it } from 'vitest';

import type { PresetSemantics } from './semantics.ts';

import { adapterPatternsOf, sliceDirectoriesOf } from './semantics.ts';

function slicing(roots: string[], adapters: string[]): PresetSemantics {
  return {
    scripts: {},
    slice: { roots, adapters },
    tests: { example: '{unit}.test.ts', property: '{unit}.property.test.ts' },
    acceptance: { runner: 'cucumber', drives: 'binary' },
    substrate: 'temporary-directories',
    lockfile: 'bun.lock',
    gates: [],
    rings: { formats: [], one: [], two: [] },
    testRuntime: 'vitest',
  };
}

describe('where a slice lives and what it hands to the outside', () => {
  it('names one adapter under one layer', () => {
    expect(adapterPatternsOf(slicing(['src/commands/{slice}'], ['command.ts']))).toStrictEqual([
      'src/commands/*/command.ts',
    ]);
  });

  it('names every adapter a layer carries, since a slice can hand out more than one', () => {
    expect(
      adapterPatternsOf(slicing(['src/commands/{slice}'], ['command.ts', 'io/**'])),
    ).toStrictEqual(['src/commands/*/command.ts', 'src/commands/*/io/**']);
  });

  it('names each adapter under each layer, since a frontend keeps slices in several', () => {
    expect(
      adapterPatternsOf(slicing(['src/features/{slice}', 'src/entities/{slice}'], ['ui/**'])),
    ).toStrictEqual(['src/features/*/ui/**', 'src/entities/*/ui/**']);
  });

  it('names nothing when a preset declares no adapter', () => {
    expect(adapterPatternsOf(slicing(['src/commands/{slice}'], []))).toStrictEqual([]);
  });
});

describe('the directories a named slice would occupy', () => {
  it('names the one directory a single layer gives it', () => {
    expect(sliceDirectoriesOf(slicing(['src/commands/{slice}'], []), 'hello')).toStrictEqual([
      'src/commands/hello',
    ]);
  });

  it('names one directory per layer, so a frontend slice spans them', () => {
    expect(
      sliceDirectoriesOf(slicing(['src/features/{slice}', 'src/entities/{slice}'], []), 'login'),
    ).toStrictEqual(['src/features/login', 'src/entities/login']);
  });

  it('refuses a name no directory should carry', () => {
    expect(() => sliceDirectoriesOf(slicing(['src/commands/{slice}'], []), 'Not A Slice')).toThrow(
      'is not a slice name',
    );
  });
});
