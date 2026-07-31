import { describe, expect, it } from 'vitest';

import type { PresetSemantics } from './semantics.ts';

import {
  adapterPatternsOf,
  coveringTestsOf,
  ringOneOf,
  SLICE_PLACEHOLDER,
  sliceDirectoriesOf,
  testFileFor,
  UNIT_PLACEHOLDER,
} from './semantics.ts';

const SEMANTICS: PresetSemantics = {
  scripts: { fmt: 'oxfmt .', test: 'vitest run' },
  slice: { roots: ['src/commands/{slice}'], adapters: ['command.ts', 'io/**'] },
  tests: { example: '{unit}.test.ts', property: '{unit}.property.test.ts' },
  acceptance: { runner: 'cucumber', drives: 'binary' },
  substrate: 'temporary-directories',
  lockfile: 'bun.lock',
  gates: [],
  rings: {
    formats: [{ runs: 'oxfmt', scope: 'file' }],
    one: [
      { runs: 'oxlint', scope: 'file' },
      { runs: 'vitest run', scope: 'covering' },
    ],
    two: [{ runs: 'tsc --noEmit', scope: 'project' }],
  },
  testRuntime: 'vitest',
};

describe('naming the test file that covers a unit', () => {
  it('fills the unit name into the pattern the preset declares', () => {
    expect(testFileFor(SEMANTICS.tests.example, 'greeting')).toBe('greeting.test.ts');
    expect(testFileFor(SEMANTICS.tests.property, 'greeting')).toBe('greeting.property.test.ts');
  });

  it('refuses a unit name a file system would not hold', () => {
    expect(() => testFileFor(SEMANTICS.tests.property, 'Greeting Two')).toThrow(
      'Greeting Two is not a unit name',
    );
  });

  it('refuses a unit name that only starts out well', () => {
    expect(() => testFileFor(SEMANTICS.tests.example, 'greeting TWO')).toThrow(/unit name/);
  });

  it('accepts a unit name written with digits and hyphens', () => {
    expect(testFileFor(SEMANTICS.tests.example, 'gate-2')).toBe('gate-2.test.ts');
  });
});

describe('the token a preset marks a name with', () => {
  it('fills a slice root the preset wrote with the token the package publishes', () => {
    const declared = {
      ...SEMANTICS,
      slice: { ...SEMANTICS.slice, roots: [`src/features/${SLICE_PLACEHOLDER}`] },
    };

    expect(sliceDirectoriesOf(declared, 'auth')).toStrictEqual(['src/features/auth']);
  });

  it('fills a test pattern the preset wrote with the token the package publishes', () => {
    expect(testFileFor(`${UNIT_PLACEHOLDER}.spec.ts`, 'greeting')).toBe('greeting.spec.ts');
  });
});

describe('resolving a slice directory', () => {
  it('fills the slice name into the root the preset declares', () => {
    expect(sliceDirectoriesOf(SEMANTICS, 'auth-login')).toStrictEqual(['src/commands/auth-login']);
  });

  it('refuses a slice name that would escape the root', () => {
    expect(() => sliceDirectoriesOf(SEMANTICS, '../elsewhere')).toThrow(/slice name/);
  });

  it('refuses a slice name that only starts out well', () => {
    expect(() => sliceDirectoriesOf(SEMANTICS, 'auth login')).toThrow(/slice name/);
  });
});

describe('the paths a preset calls an adapter', () => {
  it('reads the adapter out of the slice it declares', () => {
    expect(adapterPatternsOf(SEMANTICS)).toContain('src/commands/*/command.ts');
  });

  it('reads every adapter the slice declares, not only the first', () => {
    expect(adapterPatternsOf(SEMANTICS)).toContain('src/commands/*/io/**');
  });

  it('names one pattern per adapter the slice declares', () => {
    expect(adapterPatternsOf(SEMANTICS)).toHaveLength(2);
  });

  it('leaves the source glob out, since that is what mutation covers', () => {
    expect(adapterPatternsOf(SEMANTICS)).not.toContain('src/commands/*/**/*.ts');
  });

  it('leaves tests out, since a test is not an adapter', () => {
    for (const pattern of adapterPatternsOf(SEMANTICS)) {
      expect(pattern).not.toContain('test');
    }
  });
});

describe('the whole of ring one', () => {
  it('opens with the formatter, so every check reads the formatted file', () => {
    expect(ringOneOf(SEMANTICS).slice(0, SEMANTICS.rings.formats.length)).toStrictEqual(
      SEMANTICS.rings.formats,
    );
  });

  it('closes with the checks, in the order the preset declares them', () => {
    expect(ringOneOf(SEMANTICS).slice(SEMANTICS.rings.formats.length)).toStrictEqual(
      SEMANTICS.rings.one,
    );
  });

  it('leaves ring two out, since a write does not wait for the project', () => {
    expect(ringOneOf(SEMANTICS)).not.toContainEqual(SEMANTICS.rings.two[0]);
  });
});

describe('the tests that cover a written file', () => {
  it('names both suites beside the unit that was written', () => {
    expect(coveringTestsOf(SEMANTICS, 'src/commands/hello/greeting.ts')).toStrictEqual([
      'src/commands/hello/greeting.test.ts',
      'src/commands/hello/greeting.property.test.ts',
    ]);
  });

  it('names them beside a unit at the root of the source', () => {
    expect(coveringTestsOf(SEMANTICS, 'run.ts')).toStrictEqual([
      'run.test.ts',
      'run.property.test.ts',
    ]);
  });

  it('names the test itself when the test is what was written', () => {
    expect(coveringTestsOf(SEMANTICS, 'src/commands/hello/greeting.test.ts')).toStrictEqual([
      'src/commands/hello/greeting.test.ts',
    ]);
  });

  it('names the property suite itself when that is what was written', () => {
    expect(
      coveringTestsOf(SEMANTICS, 'src/commands/hello/greeting.property.test.ts'),
    ).toStrictEqual(['src/commands/hello/greeting.property.test.ts']);
  });
});

describe('a written file no test covers', () => {
  it('names nothing for prose, since prose has no unit', () => {
    expect(coveringTestsOf(SEMANTICS, 'README.md')).toStrictEqual([]);
  });

  it('names nothing for a config, since a config has no unit', () => {
    expect(coveringTestsOf(SEMANTICS, '.oxlintrc.json')).toStrictEqual([]);
  });

  it('names nothing for a name a test file could not hold', () => {
    for (const path of ['src/contents.generated.ts', 'src/Greeting.ts', 'src/.ts']) {
      expect({ path, covering: coveringTestsOf(SEMANTICS, path) }).toStrictEqual({
        path,
        covering: [],
      });
    }
  });

  it('names nothing for a directory that only looks like source', () => {
    expect(coveringTestsOf(SEMANTICS, 'src/commands/hello')).toStrictEqual([]);
  });
});
