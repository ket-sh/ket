import { describe, expect, it } from 'vitest';

import {
  INSTALL_DEADLINE_MS,
  INSTALL_ENVIRONMENT,
  installArgvFor,
  refusalFor,
  skillsAbsentFrom,
  skillsNote,
} from './skills.ts';

const SKILL = { name: 'vitest', source: 'antfu/skills' };

const FIND_SKILLS = { name: 'find-skills', source: 'vercel-labs/skills' };

describe('what create runs to install one skill into a project', () => {
  it('names the agent and copies the files, because a fresh project detects neither', () => {
    expect(installArgvFor(SKILL)).toStrictEqual([
      'bunx',
      'skills@1.5.21',
      'add',
      'antfu/skills',
      '--skill',
      'vitest',
      '--agent',
      'claude-code',
      '--copy',
      '--yes',
    ]);
  });
});

describe('the environment create installs a skill in', () => {
  it('turns telemetry off, since it holds the tool open after the work is done', () => {
    expect(INSTALL_ENVIRONMENT['DO_NOT_TRACK']).toBe('1');
  });

  it('bounds the clone, since the tool waits five minutes on its own', () => {
    expect(Number(INSTALL_ENVIRONMENT['SKILLS_CLONE_TIMEOUT_MS'])).toBeLessThan(300000);
  });

  it('waits longer than the clone it bounds, so a clone about to finish survives', () => {
    expect(INSTALL_DEADLINE_MS).toBeGreaterThan(
      Number(INSTALL_ENVIRONMENT['SKILLS_CLONE_TIMEOUT_MS']),
    );
  });
});

describe('what the outro says about the skills', () => {
  it('says nothing when every skill the preset locked arrived', () => {
    expect(skillsNote({ installed: ['vitest', 'find-skills'] })).toStrictEqual([]);
  });

  it('says plainly that the skills did not install, and carries the reason', () => {
    expect(skillsNote({ refused: 'vitest did not install\nRun it later' })).toStrictEqual([
      'The project is ready, but its skills did not install:',
      'vitest did not install',
      'Run it later',
    ]);
  });
});

describe('which promised skills a project is missing', () => {
  it('names the skill no directory under the agent holds', () => {
    expect(skillsAbsentFrom(['find-skills'], [SKILL, FIND_SKILLS])).toStrictEqual([SKILL]);
  });

  it('names nothing when the project holds every promised skill', () => {
    expect(skillsAbsentFrom(['vitest', 'find-skills'], [SKILL, FIND_SKILLS])).toStrictEqual([]);
  });

  it('names every promised skill when the project holds none', () => {
    expect(skillsAbsentFrom([], [SKILL, FIND_SKILLS])).toStrictEqual([SKILL, FIND_SKILLS]);
  });

  it('says nothing about a skill the project holds that no preset promised', () => {
    expect(skillsAbsentFrom(['opentui'], [SKILL])).toStrictEqual([SKILL]);
  });
});

describe('what create says when a skill does not install', () => {
  it('opens by naming the skill, where it comes from, and what the tool said', () => {
    expect(refusalFor(SKILL, 'could not reach github').split('\n')[0]).toBe(
      'vitest did not install from antfu/skills: could not reach github',
    );
  });

  it('carries the command that installs it later on a line the outro can print', () => {
    expect(refusalFor(SKILL, 'could not reach github').split('\n')[1]).toBe(
      `Run it in the project later with: ${installArgvFor(SKILL).join(' ')}`,
    );
  });
});
