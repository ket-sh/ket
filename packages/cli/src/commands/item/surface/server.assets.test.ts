import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { SurfaceHandle } from './server.ts';

import { startSurface } from './server.ts';

let itemDir = '';
const open: SurfaceHandle[] = [];

async function fetchAsset(path: string): Promise<Response> {
  const handle = await startSurface(itemDir, {});

  open.push(handle);

  const address = new URL(handle.address);

  return fetch(`${address.origin}${path}?key=${address.searchParams.get('key') ?? ''}`);
}

beforeEach(async () => {
  itemDir = await mkdtemp(join(tmpdir(), 'ket-surface-assets-'));
  await writeFile(join(itemDir, 'item.yaml'), 'title: The sample item\nstatus: verifying\n');
  await mkdir(join(itemDir, 'features'));
});

afterEach(async () => {
  await Promise.all(open.splice(0).map(async (handle) => handle.stop()));
  await rm(itemDir, { recursive: true, force: true });
});

describe('the assets the page pulls', () => {
  it('hands out the bricks engine behind the key', async () => {
    const reply = await fetchAsset('/gridstack.js');

    expect(reply.status).toBe(200);
    expect(reply.headers.get('content-type')).toContain('javascript');
    expect(await reply.text()).toContain('GridStack');
  });

  it.skipIf('Bun' in globalThis)(
    'refuses the client script when the runtime cannot bundle it',
    async () => {
      const reply = await fetchAsset('/surface.js');

      expect(reply.status).toBe(501);
      expect(await reply.text()).toContain('serves under bun');
    },
  );

  it.skipIf(!('Bun' in globalThis))(
    'bundles the client script behind the key under bun',
    async () => {
      const reply = await fetchAsset('/surface.js');

      expect(reply.status).toBe(200);
      expect(reply.headers.get('content-type')).toContain('javascript');
      expect(await reply.text()).toContain('ketSurface');
    },
  );
});
