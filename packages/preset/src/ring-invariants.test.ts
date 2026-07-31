import { describe, expect, it } from 'vitest';

import type { PresetSemantics, RingSemantics } from './semantics.ts';

import { ringInvariantsOf } from './ring-invariants.ts';

const SOUND: RingSemantics = {
  formats: [{ runs: 'oxfmt', scope: 'file' }],
  one: [
    { runs: 'oxlint --no-error-on-unmatched-pattern', scope: 'file' },
    { runs: 'vitest run', scope: 'covering' },
  ],
  two: [{ runs: 'tsc --noEmit -p tsconfig.json', scope: 'project' }],
};

function semanticsRinging(rings: RingSemantics, fmt = 'oxfmt .'): PresetSemantics {
  return {
    scripts: { fmt },
    slice: { root: 'src/commands/{slice}', adapter: 'command.ts', mutate: [] },
    tests: { example: '{unit}.test.ts', property: '{unit}.property.test.ts' },
    acceptance: { runner: 'cucumber', drives: 'binary' },
    substrate: 'temporary-directories',
    lockfile: 'bun.lock',
    gates: [],
    rings,
    testRuntime: 'vitest',
  };
}

function invariantsBrokenBy(rings: Partial<RingSemantics>): string[] {
  return ringInvariantsOf(semanticsRinging({ ...SOUND, ...rings }));
}

describe('a ring that measures nothing', () => {
  it('breaks nothing when each ring holds the checks its scope allows', () => {
    expect(ringInvariantsOf(semanticsRinging(SOUND))).toStrictEqual([]);
  });

  it('names ring one when it declares no check', () => {
    expect(invariantsBrokenBy({ one: [] })).toStrictEqual([
      'ring one declares no check, so a write is measured by nothing',
    ]);
  });

  it('names ring two when it declares no check', () => {
    expect(invariantsBrokenBy({ two: [] })).toStrictEqual([
      'ring two declares no check, so a stage ends measured by nothing',
    ]);
  });

  it('names the formatter when the preset declares none', () => {
    expect(invariantsBrokenBy({ formats: [] })).toStrictEqual([
      'the preset declares no formatter, so advice about formatting fixes nothing',
    ]);
  });

  it('names a check the preset gave no command to run', () => {
    expect(invariantsBrokenBy({ one: [{ runs: '', scope: 'file' }] })).toStrictEqual([
      'the preset declares a check that runs no command',
    ]);
  });
});

describe('a check scoped wider than its ring allows', () => {
  it('names a ring one check that sweeps the project', () => {
    expect(invariantsBrokenBy({ one: [{ runs: 'knip', scope: 'project' }] })).toStrictEqual([
      'the ring one check knip sweeps the project, which a write cannot afford',
    ]);
  });

  it('names a ring two check scoped narrower than the project', () => {
    expect(invariantsBrokenBy({ two: [{ runs: 'tsc', scope: 'file' }] })).toStrictEqual([
      'the ring two check tsc is scoped to file rather than to the project',
    ]);
  });

  it('names a formatter scoped wider than one file', () => {
    expect(invariantsBrokenBy({ formats: [{ runs: 'oxfmt', scope: 'project' }] })).toStrictEqual([
      'the formatter oxfmt is scoped to project rather than to one file',
    ]);
  });

  it('names a check that reaches outside the project for its binary', () => {
    expect(invariantsBrokenBy({ one: [{ runs: '/usr/bin/oxlint', scope: 'file' }] })).toStrictEqual(
      ['the check /usr/bin/oxlint reaches outside the project for its binary'],
    );
  });
});

describe('a check that rewrites rather than reads', () => {
  it('names a formatter the preset also runs as a check', () => {
    expect(
      invariantsBrokenBy({ one: [...SOUND.one, { runs: 'oxfmt', scope: 'file' }] }),
    ).toStrictEqual(['oxfmt both rewrites a file and checks it']);
  });
});

describe('a check that runs on a runner the preset never declared', () => {
  it('names a covering check driven by another runner', () => {
    expect(invariantsBrokenBy({ one: [{ runs: 'jest', scope: 'covering' }] })).toStrictEqual([
      'the covering check jest does not run on vitest',
    ]);
  });

  it('says nothing about the runner of a check scoped to one file', () => {
    expect(invariantsBrokenBy({ one: [{ runs: 'jest', scope: 'file' }] })).toStrictEqual([]);
  });

  it('names a formatter the fmt gate would not agree with', () => {
    expect(ringInvariantsOf(semanticsRinging(SOUND, 'prettier --check .'))).toStrictEqual([
      'the formatter oxfmt is not the tool the fmt gate checks with',
    ]);
  });

  it('names the missing gate when the preset writes no fmt gate at all', () => {
    const semantics = semanticsRinging(SOUND);

    expect(ringInvariantsOf({ ...semantics, scripts: {} })).toStrictEqual([
      'the preset writes no fmt gate for its formatter to agree with',
    ]);
  });

  it('reads the tool out of a gate that runs it without an argument', () => {
    expect(ringInvariantsOf(semanticsRinging(SOUND, 'oxfmt'))).toStrictEqual([]);
  });
});
