import type { PresetSkill } from '@ket/preset';

import fc from 'fast-check';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { absentSkillsIn } from './skills-install.ts';

const NAME = fc.stringMatching(/^[a-z][a-z0-9-]{0,7}$/);

const PROMISED = fc.uniqueArray(fc.record({ name: NAME, source: NAME }), {
  selector: (skill) => skill.name,
  maxLength: 5,
});

const SCENARIO = PROMISED.chain((promised) =>
  fc.tuple(fc.constant(promised), fc.subarray(promised)),
);

async function standingIn(root: string, standing: PresetSkill[]): Promise<void> {
  for (const skill of standing) {
    await mkdir(join(root, '.claude', 'skills', skill.name), { recursive: true });
  }
}

function stillAbsentAmong(promised: PresetSkill[], standing: PresetSkill[]): PresetSkill[] {
  return promised.filter((skill) => !standing.includes(skill));
}

describe('choosing what to install, over arbitrary projects and promises', () => {
  it('names exactly the promised skills whose directory does not stand', async () => {
    await fc.assert(
      fc.asyncProperty(SCENARIO, async ([promised, standing]) => {
        const root = await mkdtemp(join(tmpdir(), 'ket-absent-'));

        await standingIn(root, standing);

        const absent = await absentSkillsIn(root, undefined, promised);

        await rm(root, { recursive: true, force: true });
        expect(absent).toStrictEqual(stillAbsentAmong(promised, standing));
      }),
      { numRuns: 40 },
    );
  });
});
