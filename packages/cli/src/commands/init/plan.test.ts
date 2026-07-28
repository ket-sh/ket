import { mkdir, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { planInitialization } from './plan.ts';

async function makeRepository(name: string): Promise<string> {
  const base = await mkdtemp(join(tmpdir(), 'ket-'));
  const repository = join(base, name);

  await mkdir(join(repository, '.git'), { recursive: true });

  return repository;
}

describe('planning what init will write', () => {
  it('defaults the project key to one derived from the repository directory', async () => {
    const repository = await makeRepository('order-fulfilment-service');

    await expect(planInitialization(repository)).resolves.toStrictEqual({
      root: repository,
      key: 'OFS',
      configured: false,
    });
  });

  it('reports a repository that already carries .ket as configured', async () => {
    const repository = await makeRepository('order-fulfilment-service');

    await mkdir(join(repository, '.ket'));

    await expect(planInitialization(repository)).resolves.toStrictEqual({
      root: repository,
      key: 'OFS',
      configured: true,
    });
  });

  it('plans from the repository root even when started deeper in the tree', async () => {
    const repository = await makeRepository('billing-gateway');
    const deep = join(repository, 'packages', 'core', 'src');

    await mkdir(deep, { recursive: true });

    await expect(planInitialization(deep)).resolves.toStrictEqual({
      root: repository,
      key: 'BG',
      configured: false,
    });
  });

  it('leaves the key unset when the directory name yields none', async () => {
    const repository = await makeRepository('2026');

    await expect(planInitialization(repository)).resolves.toStrictEqual({
      root: repository,
      key: undefined,
      configured: false,
    });
  });

  it('plans nothing outside a repository', async () => {
    const outside = await mkdtemp(join(tmpdir(), 'ket-'));

    await expect(planInitialization(outside)).resolves.toBeUndefined();
  });
});
