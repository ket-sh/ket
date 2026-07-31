export interface PresetSkill {
  name: string;
  source: string;
}

export type LockedSkills = { skills: PresetSkill[] } | { unreadable: string };

const NOT_JSON = 'the skills lockfile is not json anything can read';

const NO_SKILLS = 'the skills lockfile records no block of skills to install';

const BLOCK = '[object Object]';

function isBlock(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === BLOCK;
}

function parsedIn(lockfile: string): { holds: unknown } | { unreadable: string } {
  try {
    return { holds: JSON.parse(lockfile) };
  } catch {
    return { unreadable: NOT_JSON };
  }
}

function recordedIn(holds: unknown): Record<string, unknown> | undefined {
  const recorded = isBlock(holds) ? holds['skills'] : undefined;

  return isBlock(recorded) ? recorded : undefined;
}

function sourceOf(held: unknown): string | undefined {
  const source = isBlock(held) ? held['source'] : undefined;

  return typeof source === 'string' && source !== '' ? source : undefined;
}

function skillsIn(recorded: Record<string, unknown>): LockedSkills {
  const skills: PresetSkill[] = [];

  for (const [name, held] of Object.entries(recorded)) {
    const source = sourceOf(held);

    if (source === undefined) {
      return {
        unreadable: `the skills lockfile records ${name} with no source to install it from`,
      };
    }

    skills.push({ name, source });
  }

  return { skills };
}

export function skillsFrom(lockfile: string): LockedSkills {
  const parsed = parsedIn(lockfile);

  if ('unreadable' in parsed) {
    return parsed;
  }

  const recorded = recordedIn(parsed.holds);

  return recorded === undefined ? { unreadable: NO_SKILLS } : skillsIn(recorded);
}
