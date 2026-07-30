import { describe, expect, it } from 'vitest';

import { CLI_SEMANTICS, coveringTestsOf } from './semantics.ts';

function covering(path: string): string[] {
  return coveringTestsOf(CLI_SEMANTICS, path);
}

describe('the tests that cover a written file', () => {
  it('names both suites beside the unit that was written', () => {
    expect(covering('src/commands/hello/greeting.ts')).toStrictEqual([
      'src/commands/hello/greeting.test.ts',
      'src/commands/hello/greeting.property.test.ts',
    ]);
  });

  it('names them beside a unit at the root of the source', () => {
    expect(covering('run.ts')).toStrictEqual(['run.test.ts', 'run.property.test.ts']);
  });

  it('names the test itself when the test is what was written', () => {
    expect(covering('src/commands/hello/greeting.test.ts')).toStrictEqual([
      'src/commands/hello/greeting.test.ts',
    ]);
  });

  it('names the property suite itself when that is what was written', () => {
    expect(covering('src/commands/hello/greeting.property.test.ts')).toStrictEqual([
      'src/commands/hello/greeting.property.test.ts',
    ]);
  });
});

describe('a written file no test covers', () => {
  it('names nothing for prose, since prose has no unit', () => {
    expect(covering('README.md')).toStrictEqual([]);
  });

  it('names nothing for a config, since a config has no unit', () => {
    expect(covering('.oxlintrc.json')).toStrictEqual([]);
  });

  it('names nothing for a name a test file could not hold', () => {
    for (const path of ['src/contents.generated.ts', 'src/Greeting.ts', 'src/.ts']) {
      expect({ path, covering: covering(path) }).toStrictEqual({ path, covering: [] });
    }
  });

  it('names nothing for a directory that only looks like source', () => {
    expect(covering('src/commands/hello')).toStrictEqual([]);
  });
});
