import type { PresetSemantics } from '@ket/preset';

import { SLICE_PLACEHOLDER, UNIT_PLACEHOLDER } from '@ket/preset';

export const WEB_SEMANTICS: PresetSemantics = {
  scripts: {
    dev: 'vite dev',
    build: 'vite build',
    start: 'vite preview',
    test: 'vitest run --project domain',
    'test:browser': 'playwright test',
    'test:mutation': 'stryker run',
    lint: 'oxlint .',
    'lint:boundaries': 'steiger src --fail-on-warnings',
    'lint:dead': 'knip',
    'lint:dup': 'jscpd -c .jscpd.json src',
    'lint:spell': 'cspell --no-progress --dot "**"',
    'lint:prose':
      'mise install -q && mise exec -- sh -c "test -d .vale/styles/Microsoft || vale sync && vale ."',
    'lint:secrets': 'mise install -q && mise exec -- gitleaks dir --redact --no-banner .',
    'lint:workflows':
      'mise install -q && mise exec -- zizmor --min-severity medium .github/workflows/ && mise exec -- actionlint -color',
    fmt: 'oxfmt .',
    'fmt:check': 'oxfmt --check .',
    'check-types': 'tsc --noEmit -p tsconfig.json',
    prepare: 'lefthook install',
  },
  slice: {
    roots: [
      `src/pages/${SLICE_PLACEHOLDER}`,
      `src/widgets/${SLICE_PLACEHOLDER}`,
      `src/features/${SLICE_PLACEHOLDER}`,
      `src/entities/${SLICE_PLACEHOLDER}`,
    ],
    adapters: ['ui/**', 'api/**'],
  },
  tests: {
    example: `${UNIT_PLACEHOLDER}.test.ts`,
    property: `${UNIT_PLACEHOLDER}.property.test.ts`,
  },
  acceptance: { runner: 'playwright', drives: 'browser' },
  substrate: 'temporary-directories',
  lockfile: 'bun.lock',
  gates: [
    {
      script: 'lint',
      guards: 'It checks style, correctness and imports.',
      commitJob: 'lint',
      ciJob: 'check',
    },
    {
      script: 'check-types',
      guards: 'It checks types at full strictness.',
      commitJob: 'typecheck',
      ciJob: 'check',
    },
    {
      script: 'lint:boundaries',
      guards: 'It checks a layer imports only below it.',
      commitJob: 'boundaries',
      ciJob: 'check',
    },
    {
      script: 'lint:dead',
      guards: 'It finds code nothing reaches.',
      commitJob: 'dead',
      ciJob: 'check',
    },
    {
      script: 'lint:dup',
      guards: 'It finds knowledge written twice.',
      commitJob: 'dup',
      ciJob: 'check',
    },
    {
      script: 'lint:spell',
      guards: 'It finds words nobody has agreed on.',
      commitJob: 'spell',
      ciJob: 'check',
    },
    {
      script: 'lint:prose',
      guards: 'It checks the prose in every markdown.',
      commitJob: '',
      ciJob: 'prose',
    },
    {
      script: 'fmt:check',
      guards: 'It checks formatting, so diffs show why.',
      commitJob: 'fmt',
      ciJob: 'check',
    },
    {
      script: 'test',
      guards: 'It checks the behavior the suite claims.',
      commitJob: '',
      ciJob: 'check',
    },
    {
      script: 'lint:secrets',
      guards: 'It finds a secret before it ships.',
      commitJob: 'gitleaks',
      ciJob: 'check',
    },
    {
      script: 'lint:workflows',
      guards: 'It checks the pipeline files for defects.',
      commitJob: 'workflows',
      ciJob: 'check',
    },
    {
      script: 'test:browser',
      guards: 'It drives the pages a person will.',
      commitJob: '',
      ciJob: 'browser',
    },
    {
      script: 'test:mutation',
      guards: 'It checks that the suite asserts anything.',
      commitJob: '',
      ciJob: 'mutation',
    },
  ],
  rings: {
    formats: [{ runs: 'oxfmt', scope: 'file' }],
    one: [
      { runs: 'oxlint --no-error-on-unmatched-pattern', scope: 'file' },
      { runs: 'vitest run --project domain', scope: 'covering' },
    ],
    two: [
      { runs: 'tsc --noEmit -p tsconfig.json', scope: 'project' },
      { runs: 'steiger src --fail-on-warnings', scope: 'project' },
    ],
  },
  testRuntime: 'vitest',
};
