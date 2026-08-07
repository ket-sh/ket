import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

  it('hands out the client script behind the key under any runtime', async () => {
    const reply = await fetchAsset('/surface.js');

    expect(reply.status).toBe(200);
    expect(reply.headers.get('content-type')).toContain('javascript');
    expect(await reply.text()).toContain('ketSurface');
  });
});

async function listening(address: URL): Promise<{ socket: WebSocket; heard: string[] }> {
  const key = address.searchParams.get('key') ?? '';
  const socket = new WebSocket(`ws://127.0.0.1:${address.port}/ws?key=${key}`);
  const heard: string[] = [];

  socket.addEventListener('message', (event) => {
    heard.push(String(event.data));
  });

  await new Promise<void>((resolveOpen, rejectOpen) => {
    socket.addEventListener(
      'open',
      () => {
        resolveOpen();
      },
      { once: true },
    );
    socket.addEventListener(
      'error',
      () => {
        rejectOpen(new Error('the socket refused'));
      },
      { once: true },
    );
  });

  return { socket, heard };
}

describe('the quiet the artifact route keeps', () => {
  it('never echoes its own save back as a change', async () => {
    const handle = await startSurface(itemDir, {});

    open.push(handle);

    const address = new URL(handle.address);
    const { socket, heard } = await listening(address);
    const key = address.searchParams.get('key') ?? '';
    const reply = await fetch(
      `${address.origin}/artifact?key=${key}&name=features/sample.feature`,
      { method: 'POST', body: 'Feature: Rewritten\n' },
    );

    expect(reply.status).toBe(204);
    await new Promise<void>((rested) => {
      setTimeout(rested, 400);
    });
    expect(heard).toHaveLength(0);

    await writeFile(join(itemDir, 'solution-design.md'), '# The design grew\n');
    await vi.waitFor(() => {
      expect(heard.length).toBeGreaterThan(0);
    });
    socket.close();
  });
});
