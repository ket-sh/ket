import {
  brokenInvariantsOf,
  harnessSkillsOf,
  repositoryRootFrom,
  shippedFilesOf,
} from '@ket/preset';
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
