import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { SurfaceHandle } from './server.ts';

import { reuseOrStartSurface, startSurface, stopSurface } from './server.ts';

let itemDir = '';
const open: SurfaceHandle[] = [];

async function surfaceUp(idleMs?: number): Promise<SurfaceHandle> {
  const handle = await startSurface(itemDir, idleMs === undefined ? {} : { idleMs });

  open.push(handle);

  return handle;
}

async function nextMessage(socket: WebSocket): Promise<string> {
  return new Promise((resolve) => {
    socket.addEventListener(
      'message',
      (event) => {
        resolve(String(event.data));
      },
      { once: true },
    );
  });
}

async function opened(socket: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.addEventListener(
      'open',
      () => {
        resolve();
      },
      { once: true },
    );
    socket.addEventListener(
      'error',
      () => {
        reject(new Error('the socket refused'));
      },
      { once: true },
    );
  });
}

async function infoGone(): Promise<boolean> {
  return stat(join(itemDir, '.surface.json')).then(
    () => false,
    () => true,
  );
}

beforeEach(async () => {
  itemDir = await mkdtemp(join(tmpdir(), 'ket-surface-'));
  await writeFile(join(itemDir, 'item.yaml'), 'title: The sample item\nstatus: verifying\n');
  await writeFile(join(itemDir, 'solution-design.md'), '# The design\n\nShort.\n');
  await mkdir(join(itemDir, 'features'));
  await writeFile(join(itemDir, 'features', 'sample.feature'), 'Feature: Sample\n');
});

afterEach(async () => {
  await Promise.all(open.splice(0).map(async (handle) => handle.stop()));
  await rm(itemDir, { recursive: true, force: true });
});

describe('the key every request carries', () => {
  it('refuses every route to a request without the key', async () => {
    const handle = await surfaceUp();
    const bare = new URL(handle.address);

    for (const path of ['/', '/wireframe', '/ws']) {
      const reply = await fetch(`${bare.origin}${path}`);

      expect(reply.status).toBe(403);
    }
  });

  it('serves the assembled page behind the key', async () => {
    const handle = await surfaceUp();
    const reply = await fetch(handle.address);

    expect(reply.status).toBe(200);
    expect(await reply.text()).toContain('The sample item');
  });

  it('serves the wireframe behind the key', async () => {
    await writeFile(join(itemDir, 'ui-design.html'), '<html><body>the mock</body></html>');

    const handle = await surfaceUp();
    const address = new URL(handle.address);
    const reply = await fetch(
      `${address.origin}/wireframe?key=${address.searchParams.get('key') ?? ''}`,
    );

    expect(reply.status).toBe(200);
    expect(await reply.text()).toContain('the mock');
  });

  it('answers a missing wireframe with a refusal, never a page', async () => {
    const handle = await surfaceUp();
    const address = new URL(handle.address);
    const reply = await fetch(
      `${address.origin}/wireframe?key=${address.searchParams.get('key') ?? ''}`,
    );

    expect(reply.status).toBe(404);
  });
});

describe('the live channel', () => {
  it('pushes a change under the item to a connected socket', async () => {
    const handle = await surfaceUp();
    const address = new URL(handle.address);
    const socket = new WebSocket(
      `ws://${address.host}/ws?key=${address.searchParams.get('key') ?? ''}`,
    );

    await opened(socket);

    const pushed = nextMessage(socket);

    await writeFile(join(itemDir, 'solution-design.md'), '# The design\n\nRevised.\n');

    expect(await pushed).toBe('changed');
    socket.close();
  });
});

describe('the lifecycle of the surface', () => {
  it('reuses a live surface instead of starting a second', async () => {
    const handle = await surfaceUp();
    const again = await reuseOrStartSurface(itemDir);

    expect(again.address).toBe(handle.address);
  });

  it('starts fresh over a stale info file and overwrites it', async () => {
    await writeFile(
      join(itemDir, '.surface.json'),
      JSON.stringify({ address: 'http://127.0.0.1:1/?key=stale', port: 1, pid: 999999999 }),
    );

    const handle = await reuseOrStartSurface(itemDir);

    open.push(handle);

    expect((await fetch(handle.address)).status).toBe(200);
  });

  it('stops, closes the port, and removes the info file', async () => {
    const handle = await surfaceUp();

    await stopSurface(itemDir);

    expect(await infoGone()).toBe(true);
    await expect(fetch(handle.address)).rejects.toThrow();
  });

  it('removes the info file when idleness collects the surface', async () => {
    const handle = await surfaceUp(150);

    await new Promise((resolve) => {
      setTimeout(resolve, 400);
    });

    expect(await infoGone()).toBe(true);
    await expect(fetch(handle.address)).rejects.toThrow();
  });
});

describe('the surface another process owns', () => {
  it('adopts the live surface the info file names instead of starting', async () => {
    const foreign = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 30000)']);
    const claimed = `http://127.0.0.1:59999/?key=${'0'.repeat(32)}`;

    try {
      await writeFile(
        join(itemDir, '.surface.json'),
        JSON.stringify({ address: claimed, port: 59999, pid: foreign.pid }),
      );

      const handle = await reuseOrStartSurface(itemDir);

      expect(handle.address).toBe(claimed);
    } finally {
      foreign.kill();
    }
  });

  it('kills the foreign surface it is asked to stop and removes its trace', async () => {
    const foreign = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 30000)']);
    const exited = new Promise((resolve) => {
      foreign.once('exit', resolve);
    });

    await writeFile(
      join(itemDir, '.surface.json'),
      JSON.stringify({ address: 'http://127.0.0.1:59998/?key=x', port: 59998, pid: foreign.pid }),
    );

    await stopSurface(itemDir);
    await exited;

    expect(foreign.exitCode === null || foreign.signalCode !== null).toBe(true);
    expect(await infoGone()).toBe(true);
  });
});

describe('the artifact writes the surface accepts', () => {
  it('round-trips a feature file save', async () => {
    const handle = await surfaceUp();
    const address = new URL(handle.address);
    const reply = await fetch(
      `${address.origin}/artifact?key=${address.searchParams.get('key') ?? ''}&name=features/sample.feature`,
      { method: 'POST', body: 'Feature: Rewritten\n' },
    );

    expect(reply.status).toBe(204);
    expect(await readFile(join(itemDir, 'features', 'sample.feature'), 'utf8')).toBe(
      'Feature: Rewritten\n',
    );
  });

  it('refuses a write that walks out of the features directory', async () => {
    const handle = await surfaceUp();
    const address = new URL(handle.address);
    const key = address.searchParams.get('key') ?? '';

    for (const name of ['../item.yaml', 'features/../item.yaml', 'features/plain.txt']) {
      const reply = await fetch(
        `${address.origin}/artifact?key=${key}&name=${encodeURIComponent(name)}`,
        { method: 'POST', body: 'overwritten' },
      );

      expect(reply.status).toBe(400);
    }
  });
});
