import type { PresetSemantics } from '@ket/preset';

import { SLICE_PLACEHOLDER, STANDING_GATES, UNIT_PLACEHOLDER } from '@ket/preset';

export const WEB_SEMANTICS: PresetSemantics = {
  scripts: {
    dev: 'vite dev',
    build: 'vite build',
    start: 'vite preview',
    test: 'vitest run --project domain',
    'test:integration': 'vitest run --project integration',
    'test:browser': 'bddgen && playwright test',
    'test:mutation': 'stryker run',
    lint: 'oxlint --deny-warnings .',
    'lint:boundaries': 'steiger src --fail-on-warnings',
    'lint:dead': 'knip',
    'lint:dup': 'jscpd -c .jscpd.json src',
    'lint:spell': 'cspell --no-progress --dot "**"',
    'lint:prose':
      'mise install -q && mise exec -- sh -c "test -d .vale/styles/Microsoft || vale sync && vale ."',
    'lint:secrets': 'mise install -q && mise exec -- gitleaks dir --redact --no-banner .',
    'lint:workflows':
      'mise install -q && mise exec -- zizmor --min-severity medium .github/workflows/ && mise exec -- actionlint -color',
    'lint:ui': 'bun scripts/check-ui-pairs.mts',
    'lint:graph': 'depcruise src --output-type err-long --cache --cache-strategy content',
    'lint:env': 'bun scripts/check-env.mts',
    'test:component': 'vitest run --project component',
    storybook: 'storybook dev -p 6006',
    'storybook:build': 'storybook build',
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
  acceptance: { runner: 'playwright-bdd', drives: 'browser' },
  substrate: 'temporary-directories',
  lockfile: 'bun.lock',
  gates: [
    STANDING_GATES.lint,
    STANDING_GATES.types,
    {
      script: 'lint:boundaries',
      guards: 'It checks a layer imports only below it.',
      commitJob: 'boundaries',
      ciJob: 'check',
    },
    {
      script: 'lint:graph',
      guards: 'It checks an import crosses no boundary.',
      commitJob: 'graph',
      ciJob: 'check',
    },
    {
      script: 'lint:ui',
      guards: 'It checks a ui component ships its pair.',
      commitJob: 'ui',
      ciJob: 'check',
    },
    {
      script: 'lint:env',
      guards: 'It checks the env matches its schema.',
      commitJob: 'env',
      ciJob: 'check',
    },
    STANDING_GATES.dead,
    STANDING_GATES.dup,
    STANDING_GATES.spell,
    STANDING_GATES.prose,
    STANDING_GATES.format,
    STANDING_GATES.tests,
    {
      script: 'test:integration',
      guards: 'It checks what the slices do together.',
      commitJob: '',
      ciJob: 'check',
    },
    {
      script: 'test:component',
      guards: 'It checks a ui component on its own.',
      commitJob: '',
      ciJob: 'browser',
    },
    STANDING_GATES.secrets,
    STANDING_GATES.workflows,
    {
      script: 'test:browser',
      guards: 'It drives the pages a person will.',
      commitJob: '',
      ciJob: 'browser',
    },
    STANDING_GATES.mutation,
  ],
  rings: {
    formats: [{ runs: 'oxfmt', scope: 'file' }],
    one: [
      { runs: 'oxlint --deny-warnings --no-error-on-unmatched-pattern', scope: 'file' },
      { runs: 'vitest run --project domain', scope: 'covering' },
    ],
    two: [
      { runs: 'tsc --noEmit -p tsconfig.json', scope: 'project' },
      { runs: 'steiger src --fail-on-warnings', scope: 'project' },
    ],
  },
  testRuntime: 'vitest',
};
