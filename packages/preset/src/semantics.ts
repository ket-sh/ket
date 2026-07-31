interface SliceSemantics {
  root: string;
  adapter: string;
  mutate: string[];
}

interface AcceptanceSemantics {
  runner: string;
  drives: string;
}

interface TestSemantics {
  example: string;
  property: string;
}

export interface RingCheck {
  runs: string;
  scope: 'file' | 'covering' | 'project';
}

export interface RingSemantics {
  formats: RingCheck[];
  one: RingCheck[];
  two: RingCheck[];
}

export interface GateSemantics {
  script: string;
  guards: string;
  commitJob: string;
  ciJob: string;
}

export interface PresetSemantics {
  scripts: Record<string, string>;
  slice: SliceSemantics;
  tests: TestSemantics;
  acceptance: AcceptanceSemantics;
  substrate: string;
  lockfile: string;
  gates: GateSemantics[];
  rings: RingSemantics;
  testRuntime: string;
}

export const SLICE_PLACEHOLDER = '{slice}';

export const UNIT_PLACEHOLDER = '{unit}';

const SLICE_NAME = /^[a-z][a-z0-9-]*$/;

const UNIT_NAME = /^[a-z][a-z0-9-]*$/;

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

const SEPARATOR = '/';

const EXTENSION = '.';

function directoryOf(path: string): string {
  return path.slice(0, path.lastIndexOf(SEPARATOR) + 1);
}

function testSuffixOf(pattern: string): string {
  return pattern.slice(UNIT_PLACEHOLDER.length);
}

function sourceSuffixOf(pattern: string): string {
  return pattern.slice(pattern.lastIndexOf(EXTENSION));
}

// A written file that has no unit name has no test named after it, and running
// the whole suite instead would answer a question nobody asked.
export function coveringTestsOf(semantics: PresetSemantics, path: string): string[] {
  const patterns = [semantics.tests.example, semantics.tests.property];
  const name = path.slice(directoryOf(path).length);

  if (patterns.some((pattern) => name.endsWith(testSuffixOf(pattern)))) {
    return [path];
  }

  const source = sourceSuffixOf(semantics.tests.example);

  if (!name.endsWith(source)) {
    return [];
  }

  const unit = name.slice(0, -source.length);

  if (!UNIT_NAME.test(unit)) {
    return [];
  }

  return patterns.map((pattern) => `${directoryOf(path)}${testFileFor(pattern, unit)}`);
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
