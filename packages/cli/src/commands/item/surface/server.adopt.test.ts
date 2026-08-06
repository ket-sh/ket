import type { ChildProcess } from 'node:child_process';

import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SurfaceHandle } from './server.ts';

let itemDir = '';
const open: SurfaceHandle[] = [];
const spawned: ChildProcess[] = [];

async function bystander(): Promise<number> {
  const child = spawn('sleep', ['120']);

  spawned.push(child);

  return new Promise((settled, refused) => {
    child.once('spawn', () => {
      if (child.pid === undefined) {
        refused(new Error('the bystander has no pid'));

        return;
      }

      settled(child.pid);
    });
    child.once('error', refused);
  });
}

beforeEach(async () => {
  itemDir = await mkdtemp(join(tmpdir(), 'ket-surface-adopt-'));
  await writeFile(join(itemDir, 'item.yaml'), 'title: The adopted item\nstatus: triaged\n');
  await mkdir(join(itemDir, 'features'));
});

afterEach(async () => {
  await Promise.all(open.splice(0).map(async (handle) => handle.stop()));

  for (const child of spawned.splice(0)) {
    child.kill();
  }

  await rm(itemDir, { recursive: true, force: true });
});

describe('the info file a recycled pid forged', () => {
  it('starts fresh instead of adopting its own ghost', async () => {
    vi.resetModules();

    const fresh = await import('./server.ts');

    await writeFile(
      join(itemDir, '.surface.json'),
      JSON.stringify({ address: 'http://127.0.0.1:1/?key=stale', port: 1, pid: process.pid }),
    );

    const handle = await fresh.reuseOrStartSurface(itemDir);

    open.push(handle);

    expect(handle.port).not.toBe(1);

    const reply = await fetch(handle.address);

    expect(reply.status).toBe(200);
  });

  it('starts fresh when the recorded address answers nobody', async () => {
    vi.resetModules();

    const fresh = await import('./server.ts');
    const foreign = await bystander();

    await writeFile(
      join(itemDir, '.surface.json'),
      JSON.stringify({ address: 'http://127.0.0.1:1/?key=stale', port: 1, pid: foreign }),
    );

    const handle = await fresh.reuseOrStartSurface(itemDir);

    open.push(handle);

    expect(handle.port).not.toBe(1);

    const reply = await fetch(handle.address);

    expect(reply.status).toBe(200);
  });
});

describe('the answers adoption verifies first', () => {
  it('starts fresh when a stranger answers behind the recorded port', async () => {
    vi.resetModules();

    const fresh = await import('./server.ts');
    const stranger = await fresh.startSurface(itemDir);

    open.push(stranger);

    const origin = new URL(stranger.address).origin;

    await writeFile(
      join(itemDir, '.surface.json'),
      JSON.stringify({
        address: `${origin}/?key=not-the-key-it-serves-under0`,
        port: stranger.port,
        pid: await bystander(),
      }),
    );
    vi.resetModules();

    const again = await import('./server.ts');
    const handle = await again.reuseOrStartSurface(itemDir);

    open.push(handle);

    expect(handle.port).not.toBe(stranger.port);
  });

  it('never adopts its own answering surface', async () => {
    vi.resetModules();

    const fresh = await import('./server.ts');
    const first = await fresh.startSurface(itemDir);

    open.push(first);

    await writeFile(
      join(itemDir, '.surface.json'),
      JSON.stringify({ address: first.address, port: first.port, pid: process.pid }),
    );
    vi.resetModules();

    const again = await import('./server.ts');
    const handle = await again.reuseOrStartSurface(itemDir);

    open.push(handle);

    expect(handle.port).not.toBe(first.port);
  });
});

describe('the silence adoption abandons', () => {
  it('gives up on an address that accepts and never answers', async () => {
    vi.resetModules();

    const fresh = await import('./server.ts');
    const silent = createServer(() => {});

    await new Promise((listening) => {
      silent.listen(0, '127.0.0.1', () => {
        listening(undefined);
      });
    });

    const seat = silent.address();
    const port = seat !== null && typeof seat === 'object' ? seat.port : 0;

    try {
      await writeFile(
        join(itemDir, '.surface.json'),
        JSON.stringify({
          address: `http://127.0.0.1:${String(port)}/?key=quiet00000000000000000000000`,
          port,
          pid: await bystander(),
        }),
      );

      const handle = await fresh.reuseOrStartSurface(itemDir);

      open.push(handle);

      expect(handle.port).not.toBe(port);
    } finally {
      silent.close();
    }
  }, 10000);
});

describe('the surface adoption accepts', () => {
  it('adopts the foreign surface still answering for its address', async () => {
    vi.resetModules();

    const fresh = await import('./server.ts');
    const first = await fresh.startSurface(itemDir);

    open.push(first);

    await writeFile(
      join(itemDir, '.surface.json'),
      JSON.stringify({ address: first.address, port: first.port, pid: await bystander() }),
    );
    vi.resetModules();

    const again = await import('./server.ts');
    const handle = await again.reuseOrStartSurface(itemDir);

    expect(handle.port).toBe(first.port);
    expect(handle.address).toBe(first.address);
  });
});
