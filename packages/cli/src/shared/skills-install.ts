import type { PresetSkill } from '@ket/preset';

import { skillsFrom } from '@ket/preset';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

import type { SkillsInstalled } from './skills.ts';

import { toolRefusal } from './project-tools.ts';
import {
  INSTALL_DEADLINE_MS,
  INSTALL_ENVIRONMENT,
  installArgvFor,
  refusalFor,
  skillsAbsentFrom,
} from './skills.ts';

const SKILLS_DIRECTORY = join('.claude', 'skills');

async function added(skill: PresetSkill, root: string): Promise<string | undefined> {
  return toolRefusal(installArgvFor(skill), root, INSTALL_DEADLINE_MS, INSTALL_ENVIRONMENT);
}

function outcomeOf(installed: string[], refused: string[]): SkillsInstalled {
  return refused.length === 0 ? { installed } : { refused: refused.join('\n') };
}

async function landedAmong(
  skills: PresetSkill[],
  root: string,
): Promise<{ installed: string[]; refused: string[] }> {
  const installed: string[] = [];
  const refused: string[] = [];

  for (const skill of skills) {
    const said = await added(skill, root);

    if (said === undefined) {
      installed.push(skill.name);
    } else {
      refused.push(refusalFor(skill, said));
    }
  }

  return { installed, refused };
}

const UNSHIPPED = 'the preset shipped no skills lockfile to install from';

export async function installEach(root: string, skills: PresetSkill[]): Promise<SkillsInstalled> {
  const { installed, refused } = await landedAmong(skills, root);

  return outcomeOf(installed, refused);
}

export async function installSkills(
  root: string,
  lockfile: string | undefined,
  brought: PresetSkill[] = [],
): Promise<SkillsInstalled> {
  if (lockfile === undefined) {
    return { refused: UNSHIPPED };
  }

  const locked = skillsFrom(lockfile);

  if ('unreadable' in locked) {
    return { refused: locked.unreadable };
  }

  return installEach(root, [...locked.skills, ...brought]);
}

async function heldSkillsIn(root: string): Promise<string[]> {
  return readdir(join(root, SKILLS_DIRECTORY)).catch(() => []);
}

export async function absentSkillsIn(
  root: string,
  lockfile: string | undefined,
  brought: PresetSkill[] = [],
): Promise<PresetSkill[]> {
  const locked = lockfile === undefined ? { skills: [] } : skillsFrom(lockfile);

  if ('unreadable' in locked) {
    throw new Error(`ket cannot read the skills lockfile its preset ships: ${locked.unreadable}`);
  }

  return skillsAbsentFrom(await heldSkillsIn(root), [...locked.skills, ...brought]);
}
