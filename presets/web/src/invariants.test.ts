import {
  brokenInvariantsOf,
  harnessSkillsOf,
  repositoryRootFrom,
  shippedFilesOf,
} from '@ket/preset';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { PRESET_CONTENTS } from './contents.generated.ts';
import { WEB_PRESET } from './item.ts';
import { WEB_SEMANTICS } from './semantics.ts';

const PRESET_ROOT = join(import.meta.dirname, '..');

const REPOSITORY_ROOT = repositoryRootFrom(import.meta.dirname);

const SHARED_ROOT = join(REPOSITORY_ROOT, 'packages', 'preset');

describe('the web preset against what a preset must be', () => {
  it('breaks none of the invariants every preset has to satisfy', async () => {
    expect(
      brokenInvariantsOf({
        item: WEB_PRESET,
        semantics: WEB_SEMANTICS,
        carried: PRESET_CONTENTS,
        shipped: await shippedFilesOf(WEB_PRESET, PRESET_ROOT, SHARED_ROOT),
        harnessSkills: await harnessSkillsOf(REPOSITORY_ROOT),
      }),
    ).toStrictEqual([]);
  });
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function skillsRecordedIn(lockfile: unknown): Record<string, unknown> {
  const skills = isRecord(lockfile) ? lockfile['skills'] : undefined;

  return isRecord(skills) ? skills : {};
}

async function skillsLockAt(root: string): Promise<Record<string, unknown>> {
  const lockfile: unknown = JSON.parse(
    await readFile(join(root, 'files', 'skills-lock.json'), 'utf8'),
  );

  return skillsRecordedIn(lockfile);
}

describe("the web preset's skills lock against the shared lock it starts from", () => {
  it('carries every skill the shared lock records', async () => {
    const sharedSkills = await skillsLockAt(SHARED_ROOT);
    const webSkills = await skillsLockAt(PRESET_ROOT);

    const webCarries = Object.fromEntries(
      Object.keys(sharedSkills).map((name) => [name, webSkills[name]]),
    );

    expect(webCarries).toStrictEqual(sharedSkills);
  });
});
