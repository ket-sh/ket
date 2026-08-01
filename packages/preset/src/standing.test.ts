import { describe, expect, it } from 'vitest';

import type { PresetItem } from './item.ts';
import type { GateSemantics } from './semantics.ts';

import { integrationInvariantsOf } from './integration-invariants.ts';
import {
  STANDING_FILES,
  STANDING_GATES,
  STANDING_INTEGRATIONS,
  STANDING_TOOLCHAIN,
} from './standing.ts';

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

  it('writes each offered file where the service that reads it looks', () => {
    const offered = STANDING_INTEGRATIONS.flatMap((integration) =>
      'files' in integration ? integration.files : [],
    );

    expect(offered.map((file) => [file.path, file.target])).toStrictEqual([
      ['files/github-coverage.yml', '~/.github/workflows/coverage.yml'],
      ['files/github-codeql.yml', '~/.github/workflows/codeql.yml'],
      ['files/coderabbit.yaml', '~/.coderabbit.yaml'],
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

  it('gives every project the same files, whatever preset governs it', () => {
    expect(STANDING_FILES.map((file) => file.target)).toStrictEqual([
      '~/.oxlintrc.json',
      '~/.oxfmtrc.json',
      '~/tsconfig.json',
      '~/vitest.config.ts',
      '~/stryker.conf.json',
      '~/vitest.mutation.config.ts',
      '~/knip.json',
      '~/.jscpd.json',
      '~/cspell.json',
      '~/cspell-words.txt',
      '~/lefthook.yml',
      '~/commitlint.config.ts',
      '~/probity.config.ts',
      '~/mise.toml',
      '~/.gitleaks.toml',
      '~/.vale.ini',
      '~/.vale/styles/ket/NoEmDash.yml',
      '~/.vale/styles/ket/Terminology.yml',
      '~/.vale/styles/ket/Intensifiers.yml',
      '~/.vale/styles/ket/WeakOpeners.yml',
      '~/.vale/styles/config/vocabularies/ket/accept.txt',
      '~/.gitignore',
      '~/CLAUDE.md',
      '~/skills-lock.json',
      '~/.github/workflows/ci.yml',
    ]);
  });
});

describe('where every preset reads the files it writes', () => {
  it('reads each of them out of the file that carries its bytes', () => {
    expect(STANDING_FILES.map((file) => file.path)).toStrictEqual([
      'files/oxlintrc.json',
      'files/oxfmtrc.json',
      'files/tsconfig.json',
      'files/vitest.config.ts',
      'files/stryker.conf.json',
      'files/vitest.mutation.config.ts',
      'files/knip.json',
      'files/jscpd.json',
      'files/cspell.json',
      'files/cspell-words.txt',
      'files/lefthook.yml',
      'files/commitlint.config.ts',
      'files/probity.config.ts',
      'files/mise.toml',
      'files/gitleaks.toml',
      'files/vale.ini',
      'files/vale-styles/NoEmDash.yml',
      'files/vale-styles/Terminology.yml',
      'files/vale-styles/Intensifiers.yml',
      'files/vale-styles/WeakOpeners.yml',
      'files/vale-vocabulary/accept.txt',
      'files/gitignore',
      'files/CLAUDE.md',
      'files/skills-lock.json',
      'files/github-ci.yml',
    ]);
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

const EVERY_GATE: GateSemantics[] = [
  STANDING_GATES.lint,
  STANDING_GATES.types,
  STANDING_GATES.dead,
  STANDING_GATES.dup,
  STANDING_GATES.spell,
  STANDING_GATES.prose,
  STANDING_GATES.format,
  STANDING_GATES.tests,
  STANDING_GATES.secrets,
  STANDING_GATES.workflows,
  STANDING_GATES.mutation,
];

describe('the gates every preset arms', () => {
  it('names the gate behind each one it offers', () => {
    expect(Object.keys(STANDING_GATES)).toStrictEqual([
      'lint',
      'types',
      'dead',
      'dup',
      'spell',
      'prose',
      'format',
      'tests',
      'secrets',
      'workflows',
      'mutation',
    ]);
  });

  it('runs each one through the script a project declares under that name', () => {
    expect(STANDING_GATES.lint.script).toBe('lint');
    expect(STANDING_GATES.types.script).toBe('check-types');
    expect(STANDING_GATES.dead.script).toBe('lint:dead');
    expect(STANDING_GATES.dup.script).toBe('lint:dup');
    expect(STANDING_GATES.spell.script).toBe('lint:spell');
    expect(STANDING_GATES.prose.script).toBe('lint:prose');
    expect(STANDING_GATES.format.script).toBe('fmt:check');
    expect(STANDING_GATES.tests.script).toBe('test');
    expect(STANDING_GATES.secrets.script).toBe('lint:secrets');
    expect(STANDING_GATES.workflows.script).toBe('lint:workflows');
    expect(STANDING_GATES.mutation.script).toBe('test:mutation');
  });
});

describe('what every standing gate has to say for itself', () => {
  it('says what every one of them guards, since a bare command teaches nothing', () => {
    for (const gate of EVERY_GATE) {
      expect({ script: gate.script, says: gate.guards }).toStrictEqual({
        script: gate.script,
        says: gate.guards,
      });
      expect(gate.guards.length).toBeGreaterThan(0);
    }
  });

  it('sends every one of them to a job the pipeline runs', () => {
    for (const gate of EVERY_GATE) {
      expect({ script: gate.script, job: gate.ciJob.length > 0 }).toStrictEqual({
        script: gate.script,
        job: true,
      });
    }
  });

  it('runs all but the prose and the mutation gate in the one check job', () => {
    const elsewhere = EVERY_GATE.filter((gate) => gate.ciJob !== 'check').map(
      (gate) => gate.script,
    );

    expect(elsewhere).toStrictEqual(['lint:prose', 'test:mutation']);
  });

  it('arms at commit only what a commit can afford to wait for', () => {
    const armed = EVERY_GATE.filter((gate) => gate.commitJob !== '').map((gate) => gate.commitJob);

    expect(armed).toStrictEqual([
      'lint',
      'typecheck',
      'dead',
      'dup',
      'spell',
      'fmt',
      'gitleaks',
      'workflows',
    ]);
  });

  it('sends the one that measures the suite to a job of its own', () => {
    expect(STANDING_GATES.mutation.ciJob).toBe('mutation');
  });
});
