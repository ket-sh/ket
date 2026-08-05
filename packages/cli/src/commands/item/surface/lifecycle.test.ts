import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { closingSurface } from './lifecycle.ts';
import { startSurface, stopSurface } from './server.ts';

let root = '';
let itemDir = '';

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'ket-lifecycle-'));
  itemDir = join(root, '.ket', 'items', 'K-1');
  await mkdir(itemDir, { recursive: true });
  await writeFile(join(itemDir, 'item.yaml'), 'title: The K-1 work\nstatus: verifying\n');
});

afterEach(async () => {
  await stopSurface(itemDir);
  await rm(root, { recursive: true, force: true });
});

describe('the surface a stage transition closes', () => {
  it('stops the item surface when the decision moves the item', async () => {
    const handle = await startSurface(itemDir);
    const decided = closingSurface(async () => Promise.resolve({ moved: 'implementing' }));

    const outcome = await decided({}, root, 'K-1');

    expect(outcome).toEqual({ moved: 'implementing' });
    await expect(fetch(handle.address)).rejects.toThrow();
  });

  it('leaves the surface alive when the decision refuses the move', async () => {
    const handle = await startSurface(itemDir);
    const decided = closingSurface(async () => Promise.resolve({ refused: 'not ready' }));

    const outcome = await decided({}, root, 'K-1');

    expect(outcome).toEqual({ refused: 'not ready' });
    expect((await fetch(handle.address)).status).toBe(200);
  });
});
