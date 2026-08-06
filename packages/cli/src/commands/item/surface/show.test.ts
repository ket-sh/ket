import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { stopSurface } from './server.ts';
import { showSurface } from './show.ts';

let root = '';

async function filed(key: string): Promise<void> {
  const directory = join(root, '.ket', 'items', key);

  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'item.yaml'), `title: The ${key} work\nstatus: verifying\n`);
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'ket-show-'));
});

afterEach(async () => {
  await stopSurface(join(root, '.ket', 'items', 'K-1'));
  await rm(root, { recursive: true, force: true });
});

describe('showing an item its surface', () => {
  it('starts the surface for a filed item and hands back its keyed address', async () => {
    await filed('K-1');

    const handle = await showSurface(root, 'K-1');
    const reply = await fetch(handle.address);

    expect(handle.address).toContain('key=');
    expect(reply.status).toBe(200);
    expect(await reply.text()).toContain('The K-1 work');
  });

  it('reuses the running surface instead of starting a second', async () => {
    await filed('K-1');

    const first = await showSurface(root, 'K-1');
    const second = await showSurface(root, 'K-1');

    expect(second.address).toBe(first.address);
  });

  it('refuses a key the repository holds no item for', async () => {
    await expect(showSurface(root, 'K-9')).rejects.toThrow('K-9 has no item');
  });

  it('tells the opener where the surface lives', async () => {
    await filed('K-1');

    const openedAt: string[] = [];
    const handle = await showSurface(root, 'K-1', (address) => {
      openedAt.push(address);
    });

    expect(openedAt).toEqual([handle.address]);
  });
});
