import { describe, expect, it } from 'vitest';

import type { PresetItem } from './item.ts';
import type { GateSemantics, PresetSemantics } from './semantics.ts';

import { writes } from './item.ts';
import { pipelineInvariantsOf } from './pipeline-invariants.ts';

const WORKFLOW = `name: ci

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
    - name: lint
      run: oxlint .
`;

const SHIPPED = {
  'files/readme.md': '# ci\n',
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

describe('a gate whose pipeline job never runs its script', () => {
  it('names the gate and the job when the job exists but skips the script', () => {
    const gates = [
      LINT_GATE,
      { script: 'lint:dead', guards: 'It finds dead code.', commitJob: '', ciJob: 'check' },
      MUTATION_GATE,
    ];

    expect(pipelineInvariantsOf(ITEM, semanticsGating(gates), SHIPPED)).toStrictEqual([
      'the gate lint:dead names the pipeline job check, whose steps never run bun run lint:dead',
    ]);
  });

  it('says nothing when the named job runs the gate script among others', () => {
    const workflow = `name: ci

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - run: bun run lint
      - run: bun run lint:dead
  mutation:
    runs-on: ubuntu-latest
    steps:
      - run: bun run test:mutation
`;
    const shipped = { ...SHIPPED, 'files/github-ci.yml': workflow };
    const gates = [
      LINT_GATE,
      { script: 'lint:dead', guards: 'It finds dead code.', commitJob: '', ciJob: 'check' },
      MUTATION_GATE,
    ];

    expect(pipelineInvariantsOf(ITEM, semanticsGating(gates), shipped)).toStrictEqual([]);
  });
});

describe('what counts as a job step, and what does not', () => {
  it('reads past a workflow with no jobs section to find the script in the one that follows', () => {
    const item = {
      ...ITEM,
      files: [
        writes('readme.md', 'README.md'),
        writes('github-release.yml', '.github/workflows/release.yml'),
        writes('github-ci.yml', '.github/workflows/ci.yml'),
        writes('lefthook.yml', 'lefthook.yml'),
      ],
    };
    const shipped = {
      ...SHIPPED,
      'files/github-release.yml': 'name: release\n\non:\n  push:\n    tags: [v*]\n',
    };

    expect(pipelineInvariantsOf(item, semanticsGating(GATES), shipped)).toStrictEqual([]);
  });

  it('reads no script out of steps that dangle above any job heading', () => {
    const item = {
      ...ITEM,
      files: [
        writes('readme.md', 'README.md'),
        writes('github-weird.yml', '.github/workflows/weird.yml'),
        writes('github-ci.yml', '.github/workflows/ci.yml'),
        writes('lefthook.yml', 'lefthook.yml'),
      ],
    };
    const shipped = {
      ...SHIPPED,
      'files/github-weird.yml': 'name: weird\n\njobs:\n      - run: bun run lint:dead\n',
    };
    const gates = [
      LINT_GATE,
      { script: 'lint:dead', guards: 'It finds dead code.', commitJob: '', ciJob: 'check' },
      MUTATION_GATE,
    ];

    expect(pipelineInvariantsOf(item, semanticsGating(gates), shipped)).toStrictEqual([
      'the gate lint:dead names the pipeline job check, whose steps never run bun run lint:dead',
    ]);
  });
});

describe('the boundary between one job and the next', () => {
  it('reads no script out of a later job, even though it sits in the same file', () => {
    const gates = [
      LINT_GATE,
      { script: 'test:mutation', guards: 'It checks the suite.', commitJob: '', ciJob: 'check' },
      MUTATION_GATE,
    ];

    expect(pipelineInvariantsOf(ITEM, semanticsGating(gates), SHIPPED)).toStrictEqual([
      'the gate test:mutation names the pipeline job check, whose steps never run bun run test:mutation',
    ]);
  });

  it('reads every step of the last job, though no further job marks where it ends', () => {
    const workflow =
      'name: ci\n\njobs:\n  check:\n    runs-on: ubuntu-latest\n    steps:\n      - run: bun run lint\n  mutation:\n    runs-on: ubuntu-latest\n    steps:\n      - run: bun run test:mutation';
    const shipped = { ...SHIPPED, 'files/github-ci.yml': workflow };

    expect(pipelineInvariantsOf(ITEM, semanticsGating(GATES), shipped)).toStrictEqual([]);
  });

  it('never welds one line to the next while looking for a script, since a step reads as one line', () => {
    const workflow =
      'name: ci\n\njobs:\n  check:\n    runs-on: ubuntu-latest\n    steps:\n      - run: bun run \nlint\n';
    const shipped = { ...SHIPPED, 'files/github-ci.yml': workflow };

    expect(pipelineInvariantsOf(ITEM, semanticsGating([LINT_GATE]), shipped)).toStrictEqual([
      'the gate lint names the pipeline job check, whose steps never run bun run lint',
    ]);
  });
});
