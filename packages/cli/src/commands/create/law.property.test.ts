import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import type { ScaffoldFile } from '../../shared/write-files.ts';

import { keepingTheStandingLaw, landingThePlainLaw } from './law.ts';

const LAWS: ScaffoldFile[] = [
  { path: 'CLAUDE.md', contents: 'the standing law' },
  { path: 'CLAUDE.plain.md', contents: 'the plain law' },
];

const anInstalledFile = fc.record<ScaffoldFile>({
  path: fc.stringMatching(/^src\/[a-z]{1,8}\.ts$/u),
  contents: fc.string(),
});

const aLawChoice = fc.constantFrom(keepingTheStandingLaw, landingThePlainLaw);

type LawChoice = (installed: ScaffoldFile[]) => ScaffoldFile[];

function isALaw(file: ScaffoldFile): boolean {
  return LAWS.some((law) => law.path === file.path);
}

function exactlyOneLawLands(files: ScaffoldFile[], choose: LawChoice): void {
  const chosen = choose([...LAWS, ...files]);
  const landed = chosen.filter((file) => file.path === 'CLAUDE.md');

  expect(landed).toHaveLength(1);
  expect(chosen.map((file) => file.path)).not.toContain('CLAUDE.plain.md');
}

function everyBystanderPassesThrough(files: ScaffoldFile[], choose: LawChoice): void {
  const chosen = choose([...LAWS, ...files]);

  expect(chosen.filter((file) => !isALaw(file))).toStrictEqual(files);
}

describe('choosing a law, over arbitrary scaffolds and either choice', () => {
  it('always lands exactly one law, at CLAUDE.md, and never the plain path', () => {
    fc.assert(fc.property(fc.array(anInstalledFile), aLawChoice, exactlyOneLawLands));
  });

  it('carries every file that is not a law through untouched, in order', () => {
    fc.assert(fc.property(fc.array(anInstalledFile), aLawChoice, everyBystanderPassesThrough));
  });
});
