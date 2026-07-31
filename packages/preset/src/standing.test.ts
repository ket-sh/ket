import { describe, expect, it } from 'vitest';

import type { PresetItem } from './item.ts';

import { integrationInvariantsOf } from './integration-invariants.ts';
import { STANDING_FILES, STANDING_INTEGRATIONS, STANDING_TOOLCHAIN } from './standing.ts';

const OFFERING: PresetItem = {
  $schema: 'https://ui.shadcn.com/schema/registry-item.json',
  name: 'ket-example',
  type: 'registry:item',
  title: 'ket example',
  description: 'A preset written to be read by a test.',
  dependencies: [],
  devDependencies: [],
  files: [],
  integrations: STANDING_INTEGRATIONS,
};

describe('the integrations every preset offers', () => {
  it('offers the services that answer for a repository whatever it holds', () => {
    expect(STANDING_INTEGRATIONS.map((offered) => offered.name)).toStrictEqual([
      'codecov',
      'codeql',
      'coderabbit',
    ]);
  });

  it('breaks none of the invariants an integration has to satisfy', () => {
    expect(integrationInvariantsOf(OFFERING)).toStrictEqual([]);
  });
});

describe('the files every preset writes', () => {
  it('writes each target once, since a second write never arrives', () => {
    const targets = STANDING_FILES.map((file) => file.target);

    expect(new Set(targets).size).toBe(targets.length);
  });

  it('reads every one of them out of the directory a preset ships', () => {
    for (const file of STANDING_FILES) {
      expect({ path: file.path, shipped: file.path.startsWith('files/') }).toStrictEqual({
        path: file.path,
        shipped: true,
      });
    }
  });

  it('writes the standing law, so a project under any preset is governed', () => {
    expect(STANDING_FILES.map((file) => file.target)).toContain('~/CLAUDE.md');
  });
});

describe('the toolchain every preset installs', () => {
  it('pins every package, since a range moves a gate without a commit', () => {
    for (const installed of STANDING_TOOLCHAIN) {
      expect({ installed, pinned: /.@\d/u.test(installed) }).toStrictEqual({
        installed,
        pinned: true,
      });
    }
  });

  it('installs the runner the mutation gate binds to', () => {
    expect(STANDING_TOOLCHAIN.some((installed) => installed.startsWith('vitest@'))).toBe(true);
  });

  it('installs the mutation runner itself, since that is the gate this product is for', () => {
    expect(
      STANDING_TOOLCHAIN.some((installed) => installed.startsWith('@stryker-mutator/core@')),
    ).toBe(true);
  });
});
