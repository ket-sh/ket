import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { planCreation } from './plan.ts';

async function scratch(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'ket-'));
}

describe('planning what create will make', () => {
  it('takes the directory it was given and the key its name yields', async () => {
    const where = join(await scratch(), 'order-service');

    await expect(planCreation(where)).resolves.toStrictEqual({
      root: where,
      key: 'OS',
    });
  });

  it('accepts a directory that exists but holds nothing', async () => {
    const where = join(await scratch(), 'billing-gateway');

    await mkdir(where);

    await expect(planCreation(where)).resolves.toStrictEqual({
      root: where,
      key: 'BG',
    });
  });

  it('refuses a directory that already holds something', async () => {
    const where = join(await scratch(), 'taken');

    await mkdir(where);
    await writeFile(join(where, 'README.md'), 'mine\n');

    await expect(planCreation(where)).rejects.toThrow(/not empty/);
  });

  it('refuses a name that could cut the file it lands in', async () => {
    const where = join(await scratch(), "x'; const z = '");

    await expect(planCreation(where)).rejects.toThrow(/cannot name a project/);
  });

  it('leaves the key unset when the directory name yields none', async () => {
    const where = join(await scratch(), '2026');

    await expect(planCreation(where)).resolves.toStrictEqual({
      root: where,
      key: undefined,
    });
  });
});
