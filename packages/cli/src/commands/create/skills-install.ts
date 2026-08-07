import type { PresetSkill } from '@ket/preset';

import { skillsFrom } from '@ket/preset';
import { spawn } from 'node:child_process';

import type { SkillsInstalled } from './skills.ts';

import { INSTALL_DEADLINE_MS, INSTALL_ENVIRONMENT, installArgvFor, refusalFor } from './skills.ts';

// The tool logs its failures through a prompt library that writes to stdout, so
// a reader watching stderr would call every failure a success. The exit code is
// the only answer, and both streams are gathered only to quote it back.
async function added(skill: PresetSkill, root: string): Promise<string | undefined> {
  return new Promise((settle) => {
    const [binary, ...rest] = installArgvFor(skill);
    const tool = spawn(binary ?? '', rest, {
      cwd: root,
      env: { ...process.env, ...INSTALL_ENVIRONMENT },
    });
    let said = '';

    const gather = (chunk: Buffer): void => {
      said += chunk.toString();
    };

    const giveUp = setTimeout(() => {
      tool.kill();
      settle(`it was still running after ${String(INSTALL_DEADLINE_MS)}ms`);
    }, INSTALL_DEADLINE_MS);

    tool.stdout.on('data', gather);
    tool.stderr.on('data', gather);
    tool.on('error', (cause: Error) => {
      clearTimeout(giveUp);
      settle(cause.message);
    });
    tool.on('close', (code) => {
      clearTimeout(giveUp);
      settle(code === 0 ? undefined : said.trim());
    });
  });
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

export async function installSkills(
  root: string,
  lockfile: string | undefined,
  brought: PresetSkill[] = [],
): Promise<SkillsInstalled> {
  const locked = skillsFrom(lockfile ?? '');

  if ('unreadable' in locked) {
    return { refused: locked.unreadable };
  }

  const { installed, refused } = await landedAmong([...locked.skills, ...brought], root);

  return outcomeOf(installed, refused);
}
