import type { PresetSemantics } from '@ket/preset';

import { SLICE_PLACEHOLDER, STANDING_GATES, UNIT_PLACEHOLDER } from '@ket/preset';

export const CLI_SEMANTICS: PresetSemantics = {
  scripts: {
    build: 'bun build src/run.ts --compile --outfile dist/app',
    test: 'vitest run',
    'test:mutation': 'stryker run',
    lint: 'oxlint --deny-warnings .',
    'lint:boundaries': 'depcruise src --config .dependency-cruiser.cjs',
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
    roots: [`src/commands/${SLICE_PLACEHOLDER}`],
    adapters: ['command.ts', 'io/**'],
  },
  tests: {
    example: `${UNIT_PLACEHOLDER}.test.ts`,
    property: `${UNIT_PLACEHOLDER}.property.test.ts`,
  },
  acceptance: { runner: 'cucumber', drives: 'binary' },
  substrate: 'temporary-directories',
  lockfile: 'bun.lock',
  rings: {
    formats: [{ runs: 'oxfmt', scope: 'file' }],
    one: [
      { runs: 'oxlint --deny-warnings --no-error-on-unmatched-pattern', scope: 'file' },
      { runs: 'vitest run', scope: 'covering' },
    ],
    two: [
      { runs: 'tsc --noEmit -p tsconfig.json', scope: 'project' },
      { runs: 'depcruise src --config .dependency-cruiser.cjs', scope: 'project' },
      { runs: 'vitest run', scope: 'project' },
    ],
  },
  gates: [
    STANDING_GATES.lint,
    STANDING_GATES.types,
    {
      script: 'lint:boundaries',
      guards: 'It checks what a module may import.',
      commitJob: 'boundaries',
      ciJob: 'check',
    },
    STANDING_GATES.dead,
    STANDING_GATES.dup,
    STANDING_GATES.spell,
    STANDING_GATES.prose,
    STANDING_GATES.format,
    STANDING_GATES.tests,
    STANDING_GATES.secrets,
    STANDING_GATES.workflows,
    STANDING_GATES.mutation,
  ],

  testRuntime: 'vitest',
};
