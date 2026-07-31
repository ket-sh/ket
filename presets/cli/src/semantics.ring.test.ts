import { ringOneOf } from '@ket/preset';
import { describe, expect, it } from 'vitest';

import { CLI_SEMANTICS } from './semantics.ts';

describe('what the cli preset runs on every write', () => {
  it('runs the linter per file, since that is what makes the ring cheap', () => {
    const perFile = CLI_SEMANTICS.rings.one.filter((check) => check.scope === 'file');

    expect(perFile.map((check) => check.runs)).toContain('oxlint --no-error-on-unmatched-pattern');
  });

  it('runs the tests that cover the written file, since nothing else runs them', () => {
    const covering = CLI_SEMANTICS.rings.one.filter((check) => check.scope === 'covering');

    expect(covering.map((check) => check.runs)).toStrictEqual(['vitest run']);
  });

  it('rewrites the file with the formatter before any check reads it', () => {
    expect(CLI_SEMANTICS.rings.formats.map((check) => check.runs)).toStrictEqual(['oxfmt']);
  });

  it('runs the linter after the formatter, since the linter reads what was written', () => {
    const runs = ringOneOf(CLI_SEMANTICS).map((check) => check.runs);

    expect(runs.findIndex((entry) => entry.startsWith('oxfmt'))).toBeLessThan(
      runs.findIndex((entry) => entry.startsWith('oxlint')),
    );
  });
});

describe('what the cli preset runs when a stage ends', () => {
  it('holds the typechecker and the dependency graph, which a write no longer waits for', () => {
    const commands = CLI_SEMANTICS.rings.two.map((check) => check.runs).join(' ');

    expect(commands).toContain('tsc');
    expect(commands).toContain('depcruise');
  });
});
