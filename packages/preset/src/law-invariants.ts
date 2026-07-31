import type { PresetContents } from './contents.ts';
import type { PresetItem } from './item.ts';

import { writtenTo } from './contents.ts';
import { skillsFrom } from './skills.ts';

const STANDING_LAW = '~/CLAUDE.md';

const SKILLS_LOCKFILE = '~/skills-lock.json';

const QUOTE = '`';

const MENTION = '` skill';

const NAMED_SKILL = /`[a-z][a-z0-9-]*` skill/gu;

const NO_LAW =
  'the preset writes no standing law, so an agent in a project under it is governed by nothing';

const NO_LOCKFILE =
  'the preset writes a standing law but no skills lockfile, so nothing records what a project under it installs';

function skillsNamedIn(law: string): string[] {
  return [...law.matchAll(NAMED_SKILL)].map((found) =>
    found[0].slice(QUOTE.length, -MENTION.length),
  );
}

export function lawInvariantsOf(
  item: PresetItem,
  shipped: PresetContents,
  harnessSkills: string[],
): string[] {
  const law = writtenTo(item, shipped, STANDING_LAW);

  if (law === undefined) {
    return [NO_LAW];
  }

  const lockfile = writtenTo(item, shipped, SKILLS_LOCKFILE);

  if (lockfile === undefined) {
    return [NO_LOCKFILE];
  }

  const locked = skillsFrom(lockfile);

  if ('unreadable' in locked) {
    return [locked.unreadable];
  }

  const shipping = new Set([...harnessSkills, ...locked.skills.map((skill) => skill.name)]);

  return skillsNamedIn(law)
    .filter((named) => !shipping.has(named))
    .map(
      (named) =>
        `the standing law names the ${named} skill, which neither the harness nor the lockfile the preset writes ships`,
    );
}
