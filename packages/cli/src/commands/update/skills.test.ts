import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { installPending } from './skills.ts';

describe('installing what an update found pending', () => {
  it('reports nothing where nothing was pending', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ket-update-skills-'));

    await expect(installPending(root, [])).resolves.toStrictEqual([]);
  });
});
