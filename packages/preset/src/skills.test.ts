import { describe, expect, it } from 'vitest';

import { skillsFrom } from './skills.ts';

const LOCKFILE = JSON.stringify({
  version: 1,
  skills: {
    'find-skills': {
      source: 'vercel-labs/skills',
      sourceType: 'github',
      skillPath: 'skills/find-skills/SKILL.md',
      computedHash: 'b146008599c31057cef1c145774cea5d5afb30e8f43fa802e47a4b461419aaaf',
    },
    vitest: {
      source: 'antfu/skills',
      sourceType: 'github',
      skillPath: 'skills/vitest/SKILL.md',
      computedHash: '943d436114c677802426741980146c07560bf375297666b03062444f4b98a785',
    },
  },
});

describe('the skills a lockfile records', () => {
  it('reads back every skill it records, with the source each one installs from', () => {
    expect(skillsFrom(LOCKFILE)).toStrictEqual({
      skills: [
        { name: 'find-skills', source: 'vercel-labs/skills' },
        { name: 'vitest', source: 'antfu/skills' },
      ],
    });
  });

  it('reads a lockfile recording nothing as recording nothing, not as a failure', () => {
    expect(skillsFrom(JSON.stringify({ version: 1, skills: {} }))).toStrictEqual({ skills: [] });
  });
});

describe('a lockfile nothing can install from', () => {
  it('refuses text that is not json, saying so rather than reporting an empty lockfile', () => {
    expect(skillsFrom('not a lockfile')).toStrictEqual({
      unreadable: 'the skills lockfile is not json anything can read',
    });
  });

  it('refuses a lockfile with no block of skills in it', () => {
    expect(skillsFrom(JSON.stringify({ version: 1 }))).toStrictEqual({
      unreadable: 'the skills lockfile records no block of skills to install',
    });
  });

  it('refuses a lockfile whose skills are written as a list rather than a block', () => {
    expect(skillsFrom(JSON.stringify({ version: 1, skills: [] }))).toStrictEqual({
      unreadable: 'the skills lockfile records no block of skills to install',
    });
  });

  it('refuses a lockfile that holds nothing at all where a lockfile should be', () => {
    expect(skillsFrom('null')).toStrictEqual({
      unreadable: 'the skills lockfile records no block of skills to install',
    });
  });

  it('refuses a lockfile that is a bare number rather than a record', () => {
    expect(skillsFrom('7')).toStrictEqual({
      unreadable: 'the skills lockfile records no block of skills to install',
    });
  });

  it('refuses a lockfile that is a list rather than a record', () => {
    expect(skillsFrom('[]')).toStrictEqual({
      unreadable: 'the skills lockfile records no block of skills to install',
    });
  });
});

describe('a skill a lockfile records without saying where it comes from', () => {
  it('names the skill it cannot install when a record is written as a list', () => {
    expect(skillsFrom(JSON.stringify({ version: 1, skills: { vitest: [] } }))).toStrictEqual({
      unreadable: 'the skills lockfile records vitest with no source to install it from',
    });
  });

  it('names the skill it cannot install when a record carries no source', () => {
    expect(skillsFrom(JSON.stringify({ version: 1, skills: { vitest: {} } }))).toStrictEqual({
      unreadable: 'the skills lockfile records vitest with no source to install it from',
    });
  });

  it('names the skill it cannot install when a source is written as an empty string', () => {
    expect(
      skillsFrom(JSON.stringify({ version: 1, skills: { vitest: { source: '' } } })),
    ).toStrictEqual({
      unreadable: 'the skills lockfile records vitest with no source to install it from',
    });
  });

  it('names the skill it cannot install when a source is not written as text', () => {
    expect(
      skillsFrom(JSON.stringify({ version: 1, skills: { vitest: { source: 7 } } })),
    ).toStrictEqual({
      unreadable: 'the skills lockfile records vitest with no source to install it from',
    });
  });
});
