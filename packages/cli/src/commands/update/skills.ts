import type { PresetSkill } from '@ket/preset';

import type { Configuration } from '../../shared/configuration.ts';
import type { ScaffoldFile } from '../../shared/write-files.ts';

import { shippedContents } from '../../shared/scaffold/install.ts';
import { skillsFor } from '../../shared/scaffold/integrations.ts';
import { absentSkillsIn, installEach } from '../../shared/skills-install.ts';
import { SKILLS_LOCKFILE } from '../../shared/skills.ts';

export async function skillsPendingIn(
  root: string,
  configuration: Configuration,
  installed: ScaffoldFile[],
): Promise<PresetSkill[]> {
  return absentSkillsIn(
    root,
    shippedContents(installed, SKILLS_LOCKFILE),
    skillsFor(Object.values(configuration.targets), configuration.integrations),
  );
}

export async function installPending(root: string, pending: PresetSkill[]): Promise<string[]> {
  const outcome = await installEach(root, pending);

  return 'refused' in outcome ? outcome.refused.split('\n') : [];
}
