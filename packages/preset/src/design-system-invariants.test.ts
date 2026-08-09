import { describe, expect, it } from 'vitest';

import type { PresetItem } from './item.ts';

import { designSystemInvariantsOf } from './design-system-invariants.ts';
import { writes } from './item.ts';

const ITEM: PresetItem = {
  $schema: 'https://ui.shadcn.com/schema/registry-item.json',
  name: 'ket-example',
  type: 'registry:item',
  title: 'ket example',
  description: 'A preset written to be read by a test.',
  dependencies: [],
  devDependencies: [],
  files: [writes('components.json', 'components.json')],
  integrations: [],
};

const SHADCN_ITEM: PresetItem = { ...ITEM, designSystem: 'shadcn' };

function aliasingUtilsTo(alias: string): string {
  return JSON.stringify({ aliases: { utils: alias } });
}

function invariantsLanding(alias: string, target: string): string[] {
  const housed: PresetItem = {
    ...SHADCN_ITEM,
    files: [...SHADCN_ITEM.files, writes(`source/${target}`, target)],
  };

  return designSystemInvariantsOf(housed, { 'files/components.json': aliasingUtilsTo(alias) });
}

describe('the components.json a shadcn preset writes against the helper apply lands', () => {
  it('breaks nothing when the preset ships the file apply lands lib/utils.ts on', () => {
    expect(invariantsLanding('@/shared/lib/utils', 'src/shared/lib/utils.ts')).toStrictEqual([]);
  });

  it('names a helper the preset houses away from where apply lands', () => {
    expect(invariantsLanding('@/shared/cn', 'src/shared/cn.ts')).toStrictEqual([
      'shadcn apply lands its helper at src/shared/utils.ts, which the preset ships nowhere',
    ]);
  });

  it('holds an alias at the source root to the same landing', () => {
    expect(invariantsLanding('@/cn', 'src/cn.ts')).toStrictEqual([
      'shadcn apply lands its helper at src/utils.ts, which the preset ships nowhere',
    ]);
  });

  it('names a shadcn preset that writes no components.json for apply to read', () => {
    expect(
      designSystemInvariantsOf({ ...ITEM, designSystem: 'shadcn', files: [] }, {}),
    ).toStrictEqual(['the shadcn preset writes no components.json for apply to read']);
  });

  it('names a components.json that aliases no utils for apply to derive its landing from', () => {
    expect(
      designSystemInvariantsOf(SHADCN_ITEM, {
        'files/components.json': JSON.stringify({ aliases: {} }),
      }),
    ).toStrictEqual(['the components.json the preset writes names no utils alias']);
  });

  it('answers a components.json that parses as no JSON with the finding, not a crash', () => {
    expect(
      designSystemInvariantsOf(SHADCN_ITEM, { 'files/components.json': 'not json' }),
    ).toStrictEqual(['the components.json the preset writes does not parse as JSON']);
  });

  it('answers a components.json that holds no record with the finding, not a crash', () => {
    expect(
      designSystemInvariantsOf(SHADCN_ITEM, { 'files/components.json': 'null' }),
    ).toStrictEqual(['the components.json the preset writes names no utils alias']);
  });

  it('answers a utils alias that is no path with the finding, not a crash', () => {
    expect(
      designSystemInvariantsOf(SHADCN_ITEM, {
        'files/components.json': JSON.stringify({ aliases: { utils: 42 } }),
      }),
    ).toStrictEqual(['the components.json the preset writes names no utils alias']);
  });

  it('demands nothing of a preset that names no design system', () => {
    expect(
      designSystemInvariantsOf(ITEM, { 'files/components.json': aliasingUtilsTo('@/shared/cn') }),
    ).toStrictEqual([]);
  });
});
