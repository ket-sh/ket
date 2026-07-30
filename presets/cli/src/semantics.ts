export interface SliceSemantics {
  root: string;
  adapter: string;
  mutate: string[];
}

export interface AcceptanceSemantics {
  runner: string;
  drives: string;
}

export interface TestSemantics {
  example: string;
  property: string;
}

export interface RingCheck {
  runs: string;
  scope: 'file' | 'project';
}

export interface RingSemantics {
  formats: RingCheck[];
  one: RingCheck[];
}

export interface GateSemantics {
  script: string;
  guards: string;
  commitJob: string;
}

export interface PresetSemantics {
  scripts: Record<string, string>;
  slice: SliceSemantics;
  tests: TestSemantics;
  acceptance: AcceptanceSemantics;
  substrate: string;
  gates: GateSemantics[];
  rings: RingSemantics;
  testRuntime: string;
}

const SLICE_PLACEHOLDER = '{slice}';

const UNIT_PLACEHOLDER = '{unit}';

const SLICE_NAME = /^[a-z][a-z0-9-]*$/;

const UNIT_NAME = /^[a-z][a-z0-9-]*$/;

export const CLI_SEMANTICS: PresetSemantics = {
  scripts: {
    build: 'bun build src/run.ts --compile --outfile dist/app',
    test: 'vitest run',
    'test:mutation': 'stryker run',
    lint: 'oxlint .',
    'lint:boundaries': 'depcruise src --config .dependency-cruiser.cjs',
    'lint:dead': 'knip',
    'lint:dup': 'jscpd -c .jscpd.json src',
    'lint:spell': 'cspell --no-progress --dot "**"',
    'lint:prose': 'mise exec -- sh -c "test -d .vale/styles/Microsoft || vale sync && vale ."',
    fmt: 'oxfmt .',
    'fmt:check': 'oxfmt --check .',
    'check-types': 'tsc --noEmit -p tsconfig.json',
    prepare: 'lefthook install',
  },
  slice: {
    root: `src/commands/${SLICE_PLACEHOLDER}`,
    adapter: 'command.ts',
    mutate: ['**/*.ts', '!**/*.test.ts', '!command.ts', '!io/**'],
  },
  tests: {
    example: `${UNIT_PLACEHOLDER}.test.ts`,
    property: `${UNIT_PLACEHOLDER}.property.test.ts`,
  },
  acceptance: { runner: 'cucumber', drives: 'binary' },
  substrate: 'temporary-directories',
  rings: {
    formats: [{ runs: 'oxfmt', scope: 'file' }],
    one: [
      { runs: 'oxlint --no-error-on-unmatched-pattern', scope: 'file' },
      { runs: 'tsc --noEmit -p tsconfig.json', scope: 'project' },
      { runs: 'depcruise src --config .dependency-cruiser.cjs', scope: 'project' },
    ],
  },
  gates: [
    { script: 'lint', guards: 'It checks style, correctness and imports.', commitJob: 'lint' },
    {
      script: 'check-types',
      guards: 'It checks types at full strictness.',
      commitJob: 'typecheck',
    },
    {
      script: 'lint:boundaries',
      guards: 'It checks what a module may import.',
      commitJob: 'boundaries',
    },
    { script: 'lint:dead', guards: 'It finds code nothing reaches.', commitJob: 'dead' },
    { script: 'lint:dup', guards: 'It finds knowledge written twice.', commitJob: 'dup' },
    { script: 'lint:spell', guards: 'It finds words nobody has agreed on.', commitJob: 'spell' },
    { script: 'lint:prose', guards: 'It checks the prose in every markdown.', commitJob: '' },
    { script: 'fmt:check', guards: 'It checks formatting, so diffs show why.', commitJob: 'fmt' },
    { script: 'test', guards: 'It checks the behavior the suite claims.', commitJob: '' },
    {
      script: 'test:mutation',
      guards: 'It checks that the suite asserts anything.',
      commitJob: '',
    },
  ],

  testRuntime: 'vitest',
};

const EXCLUSION = '!';

function isExclusion(entry: string): boolean {
  return entry.startsWith(EXCLUSION);
}

function isTestPattern(entry: string): boolean {
  return entry.includes('test');
}

export function adapterPatternsOf(semantics: PresetSemantics): string[] {
  const anySlice = semantics.slice.root.replace(SLICE_PLACEHOLDER, '*');

  return semantics.slice.mutate
    .filter((entry) => isExclusion(entry) && !isTestPattern(entry))
    .map((entry) => `${anySlice}/${entry.slice(EXCLUSION.length)}`);
}

export function ringOneOf(semantics: PresetSemantics): RingCheck[] {
  return [...semantics.rings.formats, ...semantics.rings.one];
}

export function testFileFor(pattern: string, unit: string): string {
  if (!UNIT_NAME.test(unit)) {
    throw new Error(`${unit} is not a unit name. Use lowercase letters, digits and hyphens`);
  }

  return pattern.replace(UNIT_PLACEHOLDER, unit);
}

export function sliceDirectoryOf(semantics: PresetSemantics, slice: string): string {
  if (!SLICE_NAME.test(slice)) {
    throw new Error(`${slice} is not a slice name. Use lowercase letters, digits and hyphens`);
  }

  return semantics.slice.root.replace(SLICE_PLACEHOLDER, slice);
}
