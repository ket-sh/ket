import type { PresetFile, PresetIntegration } from './item.ts';
import type { GateSemantics } from './semantics.ts';

import { writes } from './item.ts';

// Three services answer for a repository whatever it holds, and what each one
// costs is one fact rather than one per preset. A preset that offers something
// only its own target can use declares that beside its own item.
export const STANDING_INTEGRATIONS: PresetIntegration[] = [
  {
    name: 'codecov',
    category: 'coverage',
    asks: 'codecov, coverage on each pull request. Free on a public repository, paid on a private one past 250 uploads a month.',
    files: [writes('github-coverage.yml', '.github/workflows/coverage.yml')],
  },
  {
    name: 'qlty',
    category: 'coverage',
    asks: 'qlty uploads coverage and gates the diff on each pull request with no secret to store, through GitHub OIDC. Free on a public repository and a private one to 1000 analysis minutes a month, then $20 a contributor.',
    files: [writes('github-qlty-coverage.yml', '.github/workflows/coverage.yml')],
  },
  {
    name: 'codeql',
    category: 'code scanning',
    asks: 'codeql, security scanning on each push. Free on a public repository, and on a private one it needs GitHub Code Security at $30 an active committer each month.',
    files: [writes('github-codeql.yml', '.github/workflows/codeql.yml')],
  },
  {
    name: 'coderabbit',
    category: 'AI pull-request review',
    asks: 'coderabbit, a review on each pull request. Free on a public repository and on a private one, and $24 a user each month for the paid tier.',
    files: [writes('coderabbit.yaml', '.coderabbit.yaml')],
  },
  {
    name: 'greptile',
    category: 'AI pull-request review',
    asks: 'greptile reviews each pull request against a whole-repository index and the rules committed under .greptile. Installing its GitHub App is what switches it on, since no workflow arrives with it. Free for one developer at 50 reviews a month on a public repository or a private one, then $30 a seat.',
    files: [
      writes('greptile-config.json', '.greptile/config.json'),
      writes('greptile-rules.md', '.greptile/rules.md'),
    ],
  },
];

// Every preset writes these, and each supplies its own bytes for them. What is
// shared is the list of what a project gets, not what any of it says.
export const STANDING_FILES: PresetFile[] = [
  writes('oxlintrc.json', '.oxlintrc.json'),
  writes('oxfmtrc.json', '.oxfmtrc.json'),
  writes('tsconfig.json', 'tsconfig.json'),
  writes('vitest.config.ts', 'vitest.config.ts'),
  writes('stryker.conf.json', 'stryker.conf.json'),
  writes('vitest.mutation.config.ts', 'vitest.mutation.config.ts'),
  writes('mutate-changed.mts', 'scripts/mutate-changed.mts'),
  writes('knip.json', 'knip.json'),
  writes('jscpd.json', '.jscpd.json'),
  writes('cspell.json', 'cspell.json'),
  writes('cspell-words.txt', 'cspell-words.txt'),
  writes('lefthook.yml', 'lefthook.yml'),
  writes('commitlint.config.ts', 'commitlint.config.ts'),
  writes('probity.config.ts', 'probity.config.ts'),
  writes('mise.toml', 'mise.toml'),
  writes('gitleaks.toml', '.gitleaks.toml'),
  writes('vale.ini', '.vale.ini'),
  writes('vale.core.ini', '.vale.core.ini'),
  writes('vale-styles/NoEmDash.yml', '.vale/styles/ket/NoEmDash.yml'),
  writes('vale-styles/Terminology.yml', '.vale/styles/ket/Terminology.yml'),
  writes('vale-styles/Intensifiers.yml', '.vale/styles/ket/Intensifiers.yml'),
  writes('vale-styles/WeakOpeners.yml', '.vale/styles/ket/WeakOpeners.yml'),
  writes('vale-styles/PlainReadability.yml', '.vale/styles/ket/PlainReadability.yml'),
  writes('vale-vocabulary/accept.txt', '.vale/styles/config/vocabularies/ket/accept.txt'),
  writes('gitignore', '.gitignore'),
  writes('CLAUDE.md', 'CLAUDE.md'),
  writes('skills-lock.json', 'skills-lock.json'),
  writes('github-ci.yml', '.github/workflows/ci.yml'),
  writes('github-mutation-weekly.yml', '.github/workflows/mutation-weekly.yml'),
];

// The tools every gate chain runs, pinned once. A preset adds what its own
// target needs beside this, and never a second version of anything here.
export const STANDING_TOOLCHAIN: string[] = [
  'oxlint@1.76.0',
  'oxfmt@0.61.0',
  '@stylistic/eslint-plugin@5.10.0',
  'oxlint-tsgolint@7.0.2001',
  'vitest@4.1.10',
  'fast-check@4.5.0',
  '@stryker-mutator/core@9.6.1',
  '@stryker-mutator/vitest-runner@9.6.1',
  'knip@6.29.0',
  'jscpd@5.0.14',
  'cspell@10.0.1',
  'lefthook@2.1.10',
  '@commitlint/cli@21.2.1',
  '@commitlint/config-conventional@21.2.0',
  '@nizos/probity@1.10.0',
  'typescript@5.9.3',
];

// A gate that reads the same way whatever a project builds is declared once.
// A preset composes its own chain from these and adds what only it needs, so
// the order a project sees stays the preset's own decision.
interface StandingGates {
  lint: GateSemantics;
  types: GateSemantics;
  dead: GateSemantics;
  dup: GateSemantics;
  spell: GateSemantics;
  prose: GateSemantics;
  format: GateSemantics;
  tests: GateSemantics;
  secrets: GateSemantics;
  workflows: GateSemantics;
  mutation: GateSemantics;
}

export const STANDING_GATES: StandingGates = {
  lint: {
    script: 'lint',
    guards: 'It checks style, correctness and imports.',
    commitJob: 'lint',
    ciJob: 'check',
  },
  types: {
    script: 'check-types',
    guards: 'It checks types at full strictness.',
    commitJob: 'typecheck',
    ciJob: 'check',
  },
  dead: {
    script: 'lint:dead',
    guards: 'It finds code nothing reaches.',
    commitJob: 'dead',
    ciJob: 'check',
  },
  dup: {
    script: 'lint:dup',
    guards: 'It finds knowledge written twice.',
    commitJob: 'dup',
    ciJob: 'check',
  },
  spell: {
    script: 'lint:spell',
    guards: 'It finds words nobody has agreed on.',
    commitJob: 'spell',
    ciJob: 'check',
  },
  prose: {
    script: 'lint:prose',
    guards: 'It checks the prose in every markdown.',
    commitJob: '',
    ciJob: 'prose',
  },
  format: {
    script: 'fmt:check',
    guards: 'It checks formatting, so diffs show why.',
    commitJob: 'fmt',
    ciJob: 'check',
  },
  tests: {
    script: 'test',
    guards: 'It checks the behavior the suite claims.',
    commitJob: '',
    ciJob: 'check',
  },
  secrets: {
    script: 'lint:secrets',
    guards: 'It finds a secret before it ships.',
    commitJob: 'gitleaks',
    ciJob: 'check',
  },
  workflows: {
    script: 'lint:workflows',
    guards: 'It checks the pipeline files for defects.',
    commitJob: 'workflows',
    ciJob: 'check',
  },
  mutation: {
    script: 'test:mutation',
    guards: 'It checks that the suite asserts anything.',
    commitJob: '',
    ciJob: 'mutation',
  },
};
