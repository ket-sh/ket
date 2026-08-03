import { describe, expect, it } from 'vitest';

import type { PresetSubject } from './invariants.ts';

import { brokenInvariantsOf } from './invariants.ts';
import { writes } from './item.ts';

const WORKFLOW =
  'name: ci\n\njobs:\n  check:\n    runs-on: ubuntu-latest\n    steps:\n      - run: bun run lint\n      - run: bun run check-types\n      - run: bun run test\n      - run: bun run test:mutation\n';

const PLAIN_LAW = 'Read the `tdd` skill before a test, and the `vitest` skill for the runner.\n';

const LAW = `${PLAIN_LAW}\n## The pipeline\n\nDrive it with \`/ket:feature\`.\n`;

const LOCKFILE = JSON.stringify({ version: 1, skills: { vitest: { source: 'antfu/skills' } } });

const SOUND: PresetSubject = {
  harnessSkills: ['tdd', 'gates'],
  item: {
    $schema: 'https://ui.shadcn.com/schema/registry-item.json',
    name: 'ket-example',
    type: 'registry:item',
    title: 'ket example',
    description: 'A preset written to be read by a test.',
    dependencies: [],
    devDependencies: ['cucumber@13.2.0'],
    files: [
      writes('knip.json', 'knip.json'),
      writes('github-ci.yml', '.github/workflows/ci.yml'),
      writes('CLAUDE.md', 'CLAUDE.md'),
      writes('CLAUDE.plain.md', 'CLAUDE.plain.md'),
      writes('skills-lock.json', 'skills-lock.json'),
    ],
    integrations: [
      {
        name: 'codecov',
        asks: 'codecov, free on a public repo and paid on a private one.',
        files: [writes('github-coverage.yml', '.github/workflows/coverage.yml')],
      },
    ],
  },
  semantics: {
    scripts: {
      fmt: 'oxfmt .',
      lint: 'oxlint .',
      'check-types': 'tsc --noEmit',
      test: 'vitest run',
      'test:mutation': 'stryker run',
    },
    slice: { roots: ['src/commands/{slice}'], adapters: ['command.ts', 'io/**'] },
    tests: { example: '{unit}.test.ts', property: '{unit}.property.test.ts' },
    acceptance: { runner: 'cucumber', drives: 'binary' },
    substrate: 'temporary-directories',
    lockfile: 'bun.lock',
    gates: [
      { script: 'lint', guards: 'It checks style.', commitJob: '', ciJob: 'check' },
      { script: 'check-types', guards: 'It checks types.', commitJob: '', ciJob: 'check' },
      { script: 'test', guards: 'It checks behavior.', commitJob: '', ciJob: 'check' },
      { script: 'test:mutation', guards: 'It checks the suite.', commitJob: '', ciJob: 'check' },
    ],
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
    'files/CLAUDE.md': LAW,
    'files/CLAUDE.plain.md': PLAIN_LAW,
    'files/skills-lock.json': LOCKFILE,
  },
  shipped: {
    'files/knip.json': '{}\n',
    'files/github-ci.yml': WORKFLOW,
    'files/github-coverage.yml': 'name: coverage\n',
    'files/CLAUDE.md': LAW,
    'files/CLAUDE.plain.md': PLAIN_LAW,
    'files/skills-lock.json': LOCKFILE,
  },
};

const BROKEN_EVERYWHERE: PresetSubject = {
  ...SOUND,
  carried: {
    'files/github-ci.yml': WORKFLOW,
    'files/github-coverage.yml': 'name: coverage\n',
    'files/CLAUDE.md': LAW,
    'files/CLAUDE.plain.md': PLAIN_LAW,
    'files/skills-lock.json': LOCKFILE,
  },
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

const UNSHIPPED_SKILL_PAIR = {
  'files/CLAUDE.md':
    'Use the `turborepo` skill.\n\n## The pipeline\n\nDrive it with `/ket:feature`.\n',
  'files/CLAUDE.plain.md': 'Use the `turborepo` skill.\n',
};

describe('a preset against everything a preset must be', () => {
  it('breaks nothing when the preset satisfies every invariant', () => {
    expect(brokenInvariantsOf(SOUND)).toStrictEqual([]);
  });

  it('names what broke in every family at once, not the first family that broke', () => {
    expect(brokenInvariantsOf(BROKEN_EVERYWHERE)).toStrictEqual([
      'the preset promises files/knip.json but carries no such file',
      'ring two declares no check, so a stage ends measured by nothing',
      'the integration codecov does not say what a private repository pays',
    ]);
  });

  it('names the standing law it points nowhere with, alongside what else broke', () => {
    const broken: PresetSubject = {
      ...SOUND,
      harnessSkills: [],
      carried: { ...SOUND.carried, ...UNSHIPPED_SKILL_PAIR },
      shipped: { ...SOUND.shipped, ...UNSHIPPED_SKILL_PAIR },
    };

    expect(brokenInvariantsOf(broken)).toStrictEqual([
      'the standing law names the turborepo skill, which neither the harness nor the lockfile the preset writes ships',
    ]);
  });
});

describe('a preset against the pipeline and the configs it writes', () => {
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
      'the preset declares no check-types gate, and that is the gate this product is for',
      'the preset declares no test gate, and that is the gate this product is for',
      'the preset declares no test:mutation gate, and that is the gate this product is for',
      'the gate lint names the pipeline job prose, which no workflow the preset writes declares',
      'the pipeline job check belongs to no gate the preset declares',
      'the mutation config the preset writes names no test config',
      'the preset declares src/commands/*/command.ts an adapter, and the mutation config it writes never excludes it',
      'the preset declares src/commands/*/io/** an adapter, and the mutation config it writes never excludes it',
    ]);
  });
});
