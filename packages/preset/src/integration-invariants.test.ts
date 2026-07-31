import { describe, expect, it } from 'vitest';

import type { PresetIntegration, PresetItem } from './item.ts';

import { integrationInvariantsOf } from './integration-invariants.ts';
import { writes } from './item.ts';

const CODECOV: PresetIntegration = {
  name: 'codecov',
  asks: 'codecov, coverage on each pull request. Free on a public repo, paid on a private one.',
  files: [writes('github-coverage.yml', '.github/workflows/coverage.yml')],
};

function itemOffering(integrations: PresetIntegration[]): PresetItem {
  return {
    $schema: 'https://ui.shadcn.com/schema/registry-item.json',
    name: 'ket-example',
    type: 'registry:item',
    title: 'ket example',
    description: 'A preset written to be read by a test.',
    dependencies: [],
    devDependencies: [],
    files: [writes('knip.json', 'knip.json')],
    integrations,
  };
}

function invariantsBrokenBy(offered: Partial<PresetIntegration>): string[] {
  return integrationInvariantsOf(itemOffering([{ ...CODECOV, ...offered }]));
}

describe('an integration that changes nothing when it is asked for', () => {
  it('breaks nothing when the integration writes a file the preset withholds', () => {
    expect(integrationInvariantsOf(itemOffering([CODECOV]))).toStrictEqual([]);
  });

  it('breaks nothing when the preset offers no integration at all', () => {
    expect(integrationInvariantsOf(itemOffering([]))).toStrictEqual([]);
  });

  it('names an integration that changes nothing a project can see', () => {
    expect(invariantsBrokenBy({ files: [] })).toStrictEqual([
      'the integration codecov changes nothing a project can see',
    ]);
  });

  it('names an integration whose file the preset already writes unasked', () => {
    expect(invariantsBrokenBy({ files: [writes('knip.json', 'knip.json')] })).toStrictEqual([
      'the integration codecov writes ~/knip.json, which the preset already writes unasked',
    ]);
  });

  it('reads every file an integration writes, not only the first', () => {
    expect(
      invariantsBrokenBy({
        files: [
          writes('github-coverage.yml', '.github/workflows/coverage.yml'),
          writes('knip.json', 'knip.json'),
        ],
      }),
    ).toStrictEqual([
      'the integration codecov writes ~/knip.json, which the preset already writes unasked',
    ]);
  });
});

describe('what an integration tells a person before they pick it', () => {
  it('names an integration that never says its own name', () => {
    expect(
      invariantsBrokenBy({ asks: 'coverage on each pull request, public and private alike.' }),
    ).toStrictEqual([
      'the integration codecov does not name itself in the sentence that offers it',
    ]);
  });

  it('reads the name whatever case the sentence writes it in', () => {
    expect(
      invariantsBrokenBy({ asks: 'Codecov reports coverage. Free on public, paid on private.' }),
    ).toStrictEqual([]);
  });

  it('names an integration that never says what a public repository pays', () => {
    expect(invariantsBrokenBy({ asks: 'codecov, paid on a private repo.' })).toStrictEqual([
      'the integration codecov does not say what a public repository pays',
    ]);
  });

  it('names an integration that never says what a private repository pays', () => {
    expect(invariantsBrokenBy({ asks: 'codecov, free on a public repo.' })).toStrictEqual([
      'the integration codecov does not say what a private repository pays',
    ]);
  });
});

describe('what an integration has to say about itself', () => {
  it('names an integration that goes by no name at all', () => {
    expect(
      integrationInvariantsOf(
        itemOffering([
          {
            name: '',
            asks: 'a tool, free on a public repository and paid on a private one.',
            files: [writes('github-coverage.yml', '.github/workflows/coverage.yml')],
          },
        ]),
      ),
    ).toContain('an integration goes by no name, and a person picks one by name');
  });

  it('names an integration whose file lands nowhere', () => {
    expect(
      integrationInvariantsOf(
        itemOffering([
          {
            name: 'codecov',
            asks: 'codecov, free on a public repository and paid on a private one.',
            files: [{ path: 'files/github-coverage.yml', type: 'registry:file', target: '' }],
          },
        ]),
      ),
    ).toContain('the integration codecov writes a file that lands nowhere');
  });

  it('breaks nothing for a reaching integration that names both a stage and a reference', () => {
    expect(
      integrationInvariantsOf(
        itemOffering([
          {
            name: 'mobbin',
            asks: 'mobbin, free on a public repository and paid on a private one.',
            reaches: { stage: 'designing', reference: 'https://mobbin.com' },
          },
        ]),
      ),
    ).toStrictEqual([]);
  });
});

describe('where an integration lands what it writes', () => {
  it('names an integration whose file targets the repository itself', () => {
    expect(
      integrationInvariantsOf(
        itemOffering([
          {
            name: 'codecov',
            asks: 'codecov, free on a public repository and paid on a private one.',
            files: [writes('github-coverage.yml', '')],
          },
        ]),
      ),
    ).toContain('the integration codecov writes a file that lands nowhere');
  });
});

describe('what a reaching integration has to name', () => {
  it('names a reaching integration that points at no stage', () => {
    expect(
      integrationInvariantsOf(
        itemOffering([
          {
            name: 'mobbin',
            asks: 'mobbin, free on a public repository and paid on a private one.',
            reaches: { stage: '', reference: 'https://mobbin.com' },
          },
        ]),
      ),
    ).toContain('the integration mobbin reaches for nothing at any named stage');
  });

  it('names a reaching integration whose stage is nothing but spaces', () => {
    expect(
      integrationInvariantsOf(
        itemOffering([
          {
            name: 'mobbin',
            asks: 'mobbin, free on a public repository and paid on a private one.',
            reaches: { stage: '   ', reference: 'https://mobbin.com' },
          },
        ]),
      ),
    ).toContain('the integration mobbin reaches for nothing at any named stage');
  });
});

describe('what a reaching integration points at', () => {
  it('names a reaching integration whose reference is nothing but spaces', () => {
    expect(
      integrationInvariantsOf(
        itemOffering([
          {
            name: 'mobbin',
            asks: 'mobbin, free on a public repository and paid on a private one.',
            reaches: { stage: 'designing', reference: '  ' },
          },
        ]),
      ),
    ).toContain('the integration mobbin names the stage designing and nothing to reach for');
  });

  it('names a reaching integration that points at nothing', () => {
    expect(
      integrationInvariantsOf(
        itemOffering([
          {
            name: 'mobbin',
            asks: 'mobbin, free on a public repository and paid on a private one.',
            reaches: { stage: 'designing', reference: '' },
          },
        ]),
      ),
    ).toContain('the integration mobbin names the stage designing and nothing to reach for');
  });
});
