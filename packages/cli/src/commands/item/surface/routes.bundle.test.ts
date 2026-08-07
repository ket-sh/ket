import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { SurfaceHandle } from './server.ts';

import { startSurface } from './server.ts';
import { CLIENT_SCRIPT, GRID_SCRIPT } from './styles.generated.ts';

let itemDir = '';
const open: SurfaceHandle[] = [];

async function fetchAsset(path: string): Promise<Response> {
  const handle = await startSurface(itemDir, {});

  open.push(handle);

  const address = new URL(handle.address);

  return fetch(`${address.origin}${path}?key=${address.searchParams.get('key') ?? ''}`);
}

beforeEach(async () => {
  itemDir = await mkdtemp(join(tmpdir(), 'ket-surface-bundle-'));
  await writeFile(join(itemDir, 'item.yaml'), 'title: The sample item\nstatus: verifying\n');
});

afterEach(async () => {
  await Promise.all(open.splice(0).map(async (handle) => handle.stop()));
  await rm(itemDir, { recursive: true, force: true });
});

describe('the client the surface carries within itself', () => {
  it('serves the embedded client as javascript, wired and whole', async () => {
    const reply = await fetchAsset('/surface.js');

    expect(reply.status).toBe(200);
    expect(reply.headers.get('content-type')).toContain('javascript');
    expect(await reply.text()).toBe(CLIENT_SCRIPT);
  });

  it('serves every request the very same bundle', async () => {
    const reply = await fetchAsset('/surface.js');
    const first = await reply.text();
    const address = new URL(open[0]?.address ?? '');
    const again = await fetch(
      `${address.origin}/surface.js?key=${address.searchParams.get('key') ?? ''}`,
    );

    expect(await again.text()).toBe(first);
  });

  it('serves the embedded grid script beside the client', async () => {
    const reply = await fetchAsset('/gridstack.js');

    expect(reply.status).toBe(200);
    expect(await reply.text()).toBe(GRID_SCRIPT);
  });
});
