import type { PresetSkill } from '@ket/preset';

import type { ToolArgv } from './project-tools.ts';

export type SkillsInstalled = { installed: string[] } | { refused: string };

export const SKILLS_LOCKFILE = 'skills-lock.json';

const UNINSTALLED = 'The project is ready, but its skills did not install:';

const RUNNER = 'bunx';

const SKILLS_CLI = 'skills@1.5.21';

// The tool detects agents by looking for `.claude`, `.cursor` and their like. A
// project this new has none, and it then reads a skipped prompt as every agent
// it knows, so the agent has to be named.
const AGENT = 'claude-code';

const CLONE_TIMEOUT_MS = 120000;

const DEADLINE_GRACE_MS = 30000;

export const INSTALL_ENVIRONMENT: Record<string, string> = {
  DO_NOT_TRACK: '1',
  SKILLS_CLONE_TIMEOUT_MS: String(CLONE_TIMEOUT_MS),
};

export const INSTALL_DEADLINE_MS = CLONE_TIMEOUT_MS + DEADLINE_GRACE_MS;

export function installArgvFor(skill: PresetSkill): ToolArgv {
  return [
    RUNNER,
    SKILLS_CLI,
    'add',
    skill.source,
    '--skill',
    skill.name,
    '--agent',
    AGENT,
    '--copy',
    '--yes',
  ];
}

export function skillsNote(skills: SkillsInstalled): string[] {
  return 'installed' in skills ? [] : [UNINSTALLED, ...skills.refused.split('\n')];
}

export function skillsAbsentFrom(held: string[], promised: PresetSkill[]): PresetSkill[] {
  return promised.filter((skill) => !held.includes(skill.name));
}

export function refusalFor(skill: PresetSkill, said: string): string {
  return [
    `${skill.name} did not install from ${skill.source}: ${said}`,
    `Run it in the project later with: ${installArgvFor(skill).join(' ')}`,
  ].join('\n');
}
