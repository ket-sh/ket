import type { PresetSkill } from '@ket/preset';

import { skillsFrom } from '@ket/preset';

import type { SkillsInstalled } from './skills.ts';

import { toolRefusal } from './project-tools.ts';
import { INSTALL_DEADLINE_MS, INSTALL_ENVIRONMENT, installArgvFor, refusalFor } from './skills.ts';

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

  const { installed, refused } = await landedAmong([...locked.skills, ...brought], root);

  return outcomeOf(installed, refused);
}
