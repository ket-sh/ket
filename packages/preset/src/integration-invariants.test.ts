import { describe, expect, it } from 'vitest';

import type { PresetIntegration, PresetItem } from './item.ts';

import { integrationInvariantsOf } from './integration-invariants.ts';
import { writes } from './item.ts';

const CODECOV: PresetIntegration = {
  name: 'codecov',
  category: 'coverage',
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

  it('lets an integration replace a file the preset writes unasked', () => {
    expect(invariantsBrokenBy({ files: [writes('knip.json', 'knip.json')] })).toStrictEqual([]);
  });
});

describe('an integration that arrives soon', () => {
  it('is not at fault for promising nothing yet', () => {
    expect(
      integrationInvariantsOf(
        itemOffering([{ name: 'figma', category: 'design tool', soon: true }]),
      ),
    ).toStrictEqual([]);
  });

  it('still goes by a name, since the wizard shows it', () => {
    expect(
      integrationInvariantsOf(itemOffering([{ name: '', category: 'design tool', soon: true }])),
    ).toContain('an integration goes by no name, and a person picks one by name');
  });
});

describe('two integrations reaching for one file', () => {
  it('names the target, since which of them lands is whichever ran last', () => {
    const chromatic: PresetIntegration = {
      name: 'chromatic',
      category: 'visual review',
      asks: 'chromatic, on a public repository and a private one.',
      files: [writes('github-chromatic.yml', '.github/workflows/coverage.yml')],
    };

    expect(integrationInvariantsOf(itemOffering([CODECOV, chromatic]))).toStrictEqual([
      '~/.github/workflows/coverage.yml is claimed by codecov and by chromatic, so one of them never arrives',
    ]);
  });

  it('names a target one integration claims twice, since it wrote itself over', () => {
    const twice: PresetIntegration = {
      name: 'chromatic',
      category: 'visual review',
      asks: 'chromatic, on a public repository and a private one.',
      files: [
        writes('github-chromatic.yml', '.github/workflows/chromatic.yml'),
        writes('chromatic.yml', '.github/workflows/chromatic.yml'),
      ],
    };

    expect(integrationInvariantsOf(itemOffering([twice]))).toStrictEqual([
      '~/.github/workflows/chromatic.yml is claimed by chromatic and by chromatic, so one of them never arrives',
    ]);
  });

  it('breaks nothing when two integrations write different files', () => {
    const chromatic: PresetIntegration = {
      name: 'chromatic',
      category: 'visual review',
      asks: 'chromatic, on a public repository and a private one.',
      files: [writes('github-chromatic.yml', '.github/workflows/chromatic.yml')],
    };

    expect(integrationInvariantsOf(itemOffering([CODECOV, chromatic]))).toStrictEqual([]);
  });
});

describe('a category that takes one tool, whose offers stand in for each other', () => {
  it('lets two tools of one substitution slot claim one target, since a project keeps one', () => {
    const qlty: PresetIntegration = {
      name: 'qlty',
      category: 'coverage',
      asks: 'qlty, on a public repository and a private one.',
      files: [writes('github-qlty-coverage.yml', '.github/workflows/coverage.yml')],
    };

    expect(integrationInvariantsOf(itemOffering([CODECOV, qlty]))).toStrictEqual([]);
  });

  it('names a target two reviewers both claim, since a project can keep both', () => {
    const coderabbit: PresetIntegration = {
      name: 'coderabbit',
      category: 'AI pull-request review',
      asks: 'coderabbit, on a public repository and a private one.',
      files: [writes('coderabbit.yaml', '.review.yaml')],
    };
    const greptile: PresetIntegration = {
      name: 'greptile',
      category: 'AI pull-request review',
      asks: 'greptile, on a public repository and a private one.',
      files: [writes('greptile-config.json', '.review.yaml')],
    };

    expect(integrationInvariantsOf(itemOffering([coderabbit, greptile]))).toStrictEqual([
      '~/.review.yaml is claimed by coderabbit and by greptile, so one of them never arrives',
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
            category: 'coverage',
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
            category: 'coverage',
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
            category: 'design reference',
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
            category: 'coverage',
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
            category: 'design reference',
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
            category: 'design reference',
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
            category: 'design reference',
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
            category: 'design reference',
            asks: 'mobbin, free on a public repository and paid on a private one.',
            reaches: { stage: 'designing', reference: '' },
          },
        ]),
      ),
    ).toContain('the integration mobbin names the stage designing and nothing to reach for');
  });
});
