import { describe, expect, it } from 'vitest';

import type { PresetSubject } from './invariants.ts';

import { brokenInvariantsOf } from './invariants.ts';
import { writes } from './item.ts';

const WORKFLOW = 'name: ci\n\njobs:\n  check:\n    runs-on: ubuntu-latest\n';

const SOUND: PresetSubject = {
  item: {
    $schema: 'https://ui.shadcn.com/schema/registry-item.json',
    name: 'ket-example',
    type: 'registry:item',
    title: 'ket example',
    description: 'A preset written to be read by a test.',
    dependencies: [],
    devDependencies: [],
    files: [writes('knip.json', 'knip.json'), writes('github-ci.yml', '.github/workflows/ci.yml')],
    integrations: [
      {
        name: 'codecov',
        asks: 'codecov, free on a public repo and paid on a private one.',
        files: [writes('github-coverage.yml', '.github/workflows/coverage.yml')],
      },
    ],
  },
  semantics: {
    scripts: { fmt: 'oxfmt .' },
    slice: { root: 'src/commands/{slice}', adapter: 'command.ts', mutate: [] },
    tests: { example: '{unit}.test.ts', property: '{unit}.property.test.ts' },
    acceptance: { runner: 'cucumber', drives: 'binary' },
    substrate: 'temporary-directories',
    lockfile: 'bun.lock',
    gates: [{ script: 'lint', guards: 'It checks style.', commitJob: 'lint', ciJob: 'check' }],
    rings: {
      formats: [{ runs: 'oxfmt', scope: 'file' }],
      one: [{ runs: 'oxlint', scope: 'file' }],
      two: [{ runs: 'tsc --noEmit', scope: 'project' }],
    },
    testRuntime: 'vitest',
  },
  carried: {
    'files/knip.json': '{}\n',
    'files/github-ci.yml': WORKFLOW,
    'files/github-coverage.yml': 'name: coverage\n',
  },
  shipped: {
    'files/knip.json': '{}\n',
    'files/github-ci.yml': WORKFLOW,
    'files/github-coverage.yml': 'name: coverage\n',
  },
};

describe('a preset against everything a preset must be', () => {
  it('breaks nothing when the preset satisfies every invariant', () => {
    expect(brokenInvariantsOf(SOUND)).toStrictEqual([]);
  });

  it('names what broke in every family at once, not the first family that broke', () => {
    const broken: PresetSubject = {
      ...SOUND,
      carried: { 'files/github-ci.yml': WORKFLOW, 'files/github-coverage.yml': 'name: coverage\n' },
      semantics: { ...SOUND.semantics, rings: { ...SOUND.semantics.rings, two: [] } },
      item: {
        ...SOUND.item,
        integrations: [
          {
            name: 'codecov',
            asks: 'codecov, free on a public repo.',
            files: [writes('github-coverage.yml', '.github/workflows/coverage.yml')],
          },
        ],
      },
    };

    expect(brokenInvariantsOf(broken)).toStrictEqual([
      'the preset promises files/knip.json but carries no such file',
      'ring two declares no check, so a stage ends measured by nothing',
      'the integration codecov does not say what a private repository pays',
    ]);
  });

  it('names what the pipeline and the configs break, not only the item and the rings', () => {
    const broken: PresetSubject = {
      ...SOUND,
      semantics: {
        ...SOUND.semantics,
        gates: [{ script: 'lint', guards: 'It checks style.', commitJob: '', ciJob: 'prose' }],
      },
      item: {
        ...SOUND.item,
        files: [...SOUND.item.files, writes('stryker.conf.json', 'stryker.conf.json')],
      },
      carried: { ...SOUND.carried, 'files/stryker.conf.json': '{}\n' },
      shipped: { ...SOUND.shipped, 'files/stryker.conf.json': '{}\n' },
    };

    expect(brokenInvariantsOf(broken)).toStrictEqual([
      'the gate lint names the pipeline job prose, which no workflow the preset writes declares',
      'the pipeline job check belongs to no gate the preset declares',
      'the mutation config the preset writes names no test config',
    ]);
  });
});
