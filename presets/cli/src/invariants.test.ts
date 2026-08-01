import {
  brokenInvariantsOf,
  harnessSkillsOf,
  repositoryRootFrom,
  shippedFilesOf,
} from '@ket/preset';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { PRESET_CONTENTS } from './contents.generated.ts';
import { CLI_PRESET } from './item.ts';
import { CLI_SEMANTICS } from './semantics.ts';

const PRESET_ROOT = join(import.meta.dirname, '..');

const REPOSITORY_ROOT = repositoryRootFrom(import.meta.dirname);

const SHARED_ROOT = join(REPOSITORY_ROOT, 'packages', 'preset');

describe('the cli preset against what a preset must be', () => {
  it('breaks none of the invariants every preset has to satisfy', async () => {
    expect(
      brokenInvariantsOf({
        item: CLI_PRESET,
        semantics: CLI_SEMANTICS,
        carried: PRESET_CONTENTS,
        shipped: await shippedFilesOf(CLI_PRESET, PRESET_ROOT, SHARED_ROOT),
        harnessSkills: await harnessSkillsOf(REPOSITORY_ROOT),
      }),
    ).toStrictEqual([]);
  });
});
