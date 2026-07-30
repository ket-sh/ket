import { describe, expect, it } from 'vitest';

import { CLI_SEMANTICS, ringOneOf } from './semantics.ts';

describe('the ring a preset runs on every write', () => {
  it('declares at least one check, since a ring with none is not a ring', () => {
    expect(CLI_SEMANTICS.rings.one.length).toBeGreaterThan(0);
  });

  it('gives every check a command to run', () => {
    for (const check of CLI_SEMANTICS.rings.one) {
      expect({ runs: check.runs, given: check.runs.length > 0 }).toStrictEqual({
        runs: check.runs,
        given: true,
      });
    }
  });

  it('scopes every check to a file or to the project, and nothing else', () => {
    for (const check of CLI_SEMANTICS.rings.one) {
      expect({ runs: check.runs, scope: check.scope }).toStrictEqual({
        runs: check.runs,
        scope: check.scope === 'file' ? 'file' : 'project',
      });
    }
  });

  it('runs the linter per file, since that is what makes the ring cheap', () => {
    const perFile = CLI_SEMANTICS.rings.one.filter((check) => check.scope === 'file');

    expect(perFile.map((check) => check.runs)).toContain('oxlint --no-error-on-unmatched-pattern');
  });

  it('names the three checks section eight measures at one point two seconds', () => {
    const commands = CLI_SEMANTICS.rings.one.map((check) => check.runs).join(' ');

    expect(commands).toContain('oxlint');
    expect(commands).toContain('tsc');
    expect(commands).toContain('depcruise');
  });

  it('reaches every binary through the project, not through a global install', () => {
    for (const check of CLI_SEMANTICS.rings.one) {
      expect({ runs: check.runs, local: !check.runs.startsWith('/') }).toStrictEqual({
        runs: check.runs,
        local: true,
      });
    }
  });
});

describe('what rewrites a file the moment it is written', () => {
  it('declares the formatter, since advice about formatting fixes nothing', () => {
    expect(CLI_SEMANTICS.rings.formats.map((check) => check.runs)).toStrictEqual(['oxfmt']);
  });

  it('formats one file at a time, since a write is about one file', () => {
    for (const check of CLI_SEMANTICS.rings.formats) {
      expect({ runs: check.runs, scope: check.scope }).toStrictEqual({
        runs: check.runs,
        scope: 'file',
      });
    }
  });

  it('formats with the tool the fmt gate later checks, so the two never disagree', () => {
    for (const check of CLI_SEMANTICS.rings.formats) {
      expect({ runs: check.runs, gate: CLI_SEMANTICS.scripts['fmt']?.split(' ')[0] }).toStrictEqual(
        {
          runs: check.runs,
          gate: check.runs,
        },
      );
    }
  });

  it('keeps every rewrite out of the checks, since a check reads rather than writes', () => {
    const rewrites = new Set(CLI_SEMANTICS.rings.formats.map((check) => check.runs));

    for (const check of CLI_SEMANTICS.rings.one) {
      expect({ runs: check.runs, rewrites: rewrites.has(check.runs) }).toStrictEqual({
        runs: check.runs,
        rewrites: false,
      });
    }
  });
});

describe('the whole of ring one', () => {
  it('opens with the formatter, so every check reads the formatted file', () => {
    expect(ringOneOf(CLI_SEMANTICS).slice(0, CLI_SEMANTICS.rings.formats.length)).toStrictEqual(
      CLI_SEMANTICS.rings.formats,
    );
  });

  it('closes with the checks, in the order the preset declares them', () => {
    expect(ringOneOf(CLI_SEMANTICS).slice(CLI_SEMANTICS.rings.formats.length)).toStrictEqual(
      CLI_SEMANTICS.rings.one,
    );
  });

  it('runs the linter after the formatter, since the linter reads what was written', () => {
    const runs = ringOneOf(CLI_SEMANTICS).map((check) => check.runs);

    expect(runs.findIndex((entry) => entry.startsWith('oxfmt'))).toBeLessThan(
      runs.findIndex((entry) => entry.startsWith('oxlint')),
    );
  });
});
