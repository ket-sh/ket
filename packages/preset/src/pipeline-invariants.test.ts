import { describe, expect, it } from 'vitest';

import type { PresetItem } from './item.ts';
import type { GateSemantics, PresetSemantics } from './semantics.ts';

import { writes } from './item.ts';
import { pipelineInvariantsOf } from './pipeline-invariants.ts';

const WORKFLOW = `name: ci

on:
  pull_request:
    types: [opened]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - run: bun run lint
  mutation:
    runs-on: ubuntu-latest
    steps:
      - run: bun run test:mutation
`;

const README = `# ci

The pipeline this project ships reads:

jobs:
  publish:
    runs-on: ubuntu-latest
`;

const ITEM: PresetItem = {
  $schema: 'https://ui.shadcn.com/schema/registry-item.json',
  name: 'ket-example',
  type: 'registry:item',
  title: 'ket example',
  description: 'A preset written to be read by a test.',
  dependencies: [],
  devDependencies: [],
  files: [
    writes('readme.md', 'README.md'),
    writes('github-ci.yml', '.github/workflows/ci.yml'),
    writes('lefthook.yml', 'lefthook.yml'),
  ],
  integrations: [],
};

const HOOKS = `pre-commit:
  jobs:
    - name: protect-main
      run: test "$(git branch --show-current)" != "main"
    - name: lint
      run: oxlint .

commit-msg:
  jobs:
    - name: commitlint
      run: commitlint --edit {1}
`;

const SHIPPED = {
  'files/readme.md': README,
  'files/github-ci.yml': WORKFLOW,
  'files/lefthook.yml': HOOKS,
};

function semanticsGating(gates: GateSemantics[]): PresetSemantics {
  return {
    scripts: {},
    slice: { roots: ['src/commands/{slice}'], adapters: ['command.ts', 'io/**'] },
    tests: { example: '{unit}.test.ts', property: '{unit}.property.test.ts' },
    acceptance: { runner: 'cucumber', drives: 'binary' },
    substrate: 'temporary-directories',
    lockfile: 'bun.lock',
    gates,
    rings: { formats: [], one: [], two: [] },
    testRuntime: 'vitest',
  };
}

const LINT_GATE: GateSemantics = {
  script: 'lint',
  guards: 'It checks style.',
  commitJob: 'lint',
  ciJob: 'check',
};

const MUTATION_GATE: GateSemantics = {
  script: 'test:mutation',
  guards: 'It checks the suite.',
  commitJob: '',
  ciJob: 'mutation',
};

const GATES = [LINT_GATE, MUTATION_GATE];

describe('a gate the pipeline never runs', () => {
  it('breaks nothing when every gate runs somewhere and every job belongs to a gate', () => {
    expect(pipelineInvariantsOf(ITEM, semanticsGating(GATES), SHIPPED)).toStrictEqual([]);
  });

  it('names a gate whose job no workflow declares', () => {
    const gates = [
      ...GATES,
      { script: 'lint:prose', guards: 'It checks prose.', commitJob: '', ciJob: 'prose' },
    ];

    expect(pipelineInvariantsOf(ITEM, semanticsGating(gates), SHIPPED)).toStrictEqual([
      'the gate lint:prose names the pipeline job prose, which no workflow the preset writes declares',
    ]);
  });

  it('names every gate that goes missing when the preset writes no workflow at all', () => {
    const gates = GATES.map((gate) => ({ ...gate, commitJob: '' }));

    expect(
      pipelineInvariantsOf({ ...ITEM, files: [] }, semanticsGating(gates), SHIPPED),
    ).toHaveLength(2);
  });
});

describe('a pipeline job no gate claims', () => {
  it('names the job, so a job cannot outlive the gate it was written for', () => {
    expect(pipelineInvariantsOf(ITEM, semanticsGating([LINT_GATE]), SHIPPED)).toStrictEqual([
      'the pipeline job mutation belongs to no gate the preset declares',
    ]);
  });

  it('reads every workflow the preset always writes, not only the first', () => {
    const item = {
      ...ITEM,
      files: [...ITEM.files, writes('github-release.yml', '.github/workflows/release.yml')],
    };
    const shipped = {
      ...SHIPPED,
      'files/github-release.yml': 'name: release\n\njobs:\n  publish:\n    runs-on: ubuntu\n',
    };

    expect(pipelineInvariantsOf(item, semanticsGating(GATES), shipped)).toStrictEqual([
      'the pipeline job publish belongs to no gate the preset declares',
    ]);
  });

  it('reads no workflow an integration writes, since a project may never ask for it', () => {
    const item = {
      ...ITEM,
      integrations: [
        {
          name: 'codecov',
          asks: 'codecov?',
          files: [writes('github-coverage.yml', '.github/workflows/coverage.yml')],
        },
      ],
    };
    const shipped = {
      ...SHIPPED,
      'files/github-coverage.yml': 'name: coverage\n\njobs:\n  upload:\n    runs-on: ubuntu\n',
    };

    expect(pipelineInvariantsOf(item, semanticsGating(GATES), shipped)).toStrictEqual([]);
  });
});

describe('what the pipeline reads a job out of', () => {
  it('reads no job out of the events a workflow answers', () => {
    const gates = [
      ...GATES,
      { script: 'lint:dead', guards: 'It finds dead code.', commitJob: '', ciJob: 'pull_request' },
    ];

    expect(pipelineInvariantsOf(ITEM, semanticsGating(gates), SHIPPED)).toStrictEqual([
      'the gate lint:dead names the pipeline job pull_request, which no workflow the preset writes declares',
    ]);
  });

  it('reads no job out of a key that carries a value, since a job opens a block', () => {
    const shipped = {
      ...SHIPPED,
      'files/github-ci.yml':
        'name: ci\n\njobs:\n  check:\n    runs-on: ubuntu\n    steps:\n      - run: bun run lint\n  timeout: 30\n',
    };

    expect(pipelineInvariantsOf(ITEM, semanticsGating([LINT_GATE]), shipped)).toStrictEqual([]);
  });

  it('reads no job out of a file the preset writes anywhere but the pipeline directory', () => {
    expect(pipelineInvariantsOf(ITEM, semanticsGating(GATES), SHIPPED)).not.toContain(
      'the pipeline job publish belongs to no gate the preset declares',
    );
  });

  it('reads no job out of a workflow whose bytes the preset carries nowhere', () => {
    const item = { ...ITEM, files: [writes('github-ci.yml', '.github/workflows/ci.yml')] };

    expect(pipelineInvariantsOf(item, semanticsGating([]), {})).toStrictEqual([]);
  });
});

describe('a gate the commit hook never runs', () => {
  it('names a gate whose commit job the shipped hook file never runs', () => {
    const gates = [{ ...LINT_GATE, commitJob: 'style' }, MUTATION_GATE];

    expect(pipelineInvariantsOf(ITEM, semanticsGating(gates), SHIPPED)).toContain(
      'the gate lint names the commit job style, which the hook file the preset writes never runs',
    );
  });

  it('says nothing about a gate that arms no commit job at all', () => {
    const gates = [{ ...LINT_GATE, commitJob: '' }, MUTATION_GATE];

    expect(pipelineInvariantsOf(ITEM, semanticsGating(gates), SHIPPED)).toStrictEqual([]);
  });

  it('names every armed gate when the preset writes no hook file at all', () => {
    const item = { ...ITEM, files: [writes('github-ci.yml', '.github/workflows/ci.yml')] };

    expect(pipelineInvariantsOf(item, semanticsGating(GATES), SHIPPED)).toContain(
      'the gate lint names the commit job lint, and the preset writes no hook file at all',
    );
  });

  it('reads a hook file whole when no message stage follows the jobs', () => {
    const shipped = { ...SHIPPED, 'files/lefthook.yml': 'pre-commit:\n  jobs:\n    - name: lint' };

    expect(pipelineInvariantsOf(ITEM, semanticsGating(GATES), shipped)).toStrictEqual([]);
  });

  it('reads only the jobs the hook runs before a message is written', () => {
    const gates = [{ ...LINT_GATE, commitJob: 'commitlint' }, MUTATION_GATE];

    expect(pipelineInvariantsOf(ITEM, semanticsGating(gates), SHIPPED)).toContain(
      'the gate lint names the commit job commitlint, which the hook file the preset writes never runs',
    );
  });
});
