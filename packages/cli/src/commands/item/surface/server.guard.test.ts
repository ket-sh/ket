import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { connect } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { SurfaceHandle } from './server.ts';

import { reuseOrStartSurface, startSurface } from './server.ts';

let itemDir = '';
const open: SurfaceHandle[] = [];

async function surfaceUp(idleMs?: number): Promise<SurfaceHandle> {
  const handle = await startSurface(itemDir, idleMs === undefined ? {} : { idleMs });

  open.push(handle);

  return handle;
}

async function rested(ms: number): Promise<void> {
  await new Promise((woke) => {
    setTimeout(woke, ms);
  });
}

async function rawUpgrade(port: number, path: string): Promise<string> {
  return new Promise((resolveRaw) => {
    let held = '';
    const wire = connect(port, '127.0.0.1', () => {
      wire.write(
        `GET ${path} HTTP/1.1\r\nHost: surface\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: MDAwMDAwMDAwMDAwMDAwMA==\r\nSec-WebSocket-Version: 13\r\n\r\n`,
      );
    });

    wire.on('data', (chunk) => {
      held += String(chunk);
    });
    wire.on('close', () => {
      resolveRaw(held);
    });
    wire.on('error', () => {
      resolveRaw(held);
    });
  });
}

function liveSocket(address: string, path = '/ws'): WebSocket {
  const parsed = new URL(address);
  const key = parsed.searchParams.get('key') ?? '';

  return new WebSocket(`ws://127.0.0.1:${parsed.port}${path}?key=${key}`);
}

async function settledSocket(socket: WebSocket): Promise<{ opened: boolean; reason: string }> {
  return new Promise((resolveSocket) => {
    socket.addEventListener(
      'open',
      () => {
        resolveSocket({ opened: true, reason: '' });
      },
      { once: true },
    );
    socket.addEventListener(
      'error',
      (event) => {
        resolveSocket({ opened: false, reason: String(Reflect.get(event, 'message') ?? '') });
      },
      { once: true },
    );
  });
}

beforeEach(async () => {
  itemDir = await mkdtemp(join(tmpdir(), 'ket-surface-guard-'));
  await writeFile(join(itemDir, 'item.yaml'), 'title: The guarded item\nstatus: triaged\n');
  await mkdir(join(itemDir, 'features'));
});

afterEach(async () => {
  await Promise.all(open.splice(0).map(async (handle) => handle.stop()));
  await rm(itemDir, { recursive: true, force: true });
});

describe('the doors the key guards', () => {
  it('refuses a keyless request and names the reason', async () => {
    const handle = await surfaceUp();
    const reply = await fetch(`${new URL(handle.address).origin}/`);

    expect(reply.status).toBe(403);
    expect(await reply.text()).toBe('refused: missing or wrong session key');
  });

  it('refuses a live channel with a wrong key and says why', async () => {
    const handle = await surfaceUp();
    const raw = await rawUpgrade(Number(new URL(handle.address).port), '/ws?key=wrong');

    expect(raw).toContain('403 Forbidden');
  });

  it('refuses a live channel knocking on the wrong path', async () => {
    const handle = await surfaceUp();
    const parsed = new URL(handle.address);
    const raw = await rawUpgrade(
      Number(parsed.port),
      `/nope?key=${parsed.searchParams.get('key') ?? ''}`,
    );

    expect(raw).toContain('403 Forbidden');
  });

  it('keeps the door on the loopback face only', async () => {
    const handle = await surfaceUp();
    const parsed = new URL(handle.address);

    await expect(
      fetch(`http://[::1]:${parsed.port}/?key=${parsed.searchParams.get('key') ?? ''}`),
    ).rejects.toThrow();
  });
});

describe('the watch the item directory keeps', () => {
  it('hears a change deep inside the features directory', async () => {
    const handle = await surfaceUp();
    const socket = liveSocket(handle.address);
    const heard: string[] = [];

    socket.addEventListener('message', (event) => {
      heard.push(String(event.data));
    });
    await settledSocket(socket);
    await rested(450);
    heard.length = 0;
    await writeFile(join(itemDir, 'features', 'fresh.feature'), 'Feature: Fresh\n');
    await rested(400);
    socket.close();

    expect(heard).toContain('changed');
  });

  it('lets a hidden file change without a word', async () => {
    const handle = await surfaceUp();
    const socket = liveSocket(handle.address);
    const heard: string[] = [];

    socket.addEventListener('message', (event) => {
      heard.push(String(event.data));
    });
    await settledSocket(socket);
    await rested(450);
    heard.length = 0;
    await writeFile(join(itemDir, 'features', '.hidden'), 'quiet\n');
    await rested(400);
    socket.close();

    expect(heard).toEqual([]);
  });

  it('drops a pending push when the surface stops first', async () => {
    const handle = await surfaceUp();
    const socket = liveSocket(handle.address);

    await settledSocket(socket);
    await writeFile(join(itemDir, 'solution-design.md'), '# Late\n');
    await handle.stop();
    await rested(300);

    expect(socket.readyState).toBeGreaterThan(1);
  });
});

describe('the stop a surface makes', () => {
  it('stops once, however often it is asked', async () => {
    const handle = await surfaceUp();

    await handle.stop();
    await expect(handle.stop()).resolves.toBeUndefined();
  });

  it('cuts the live clients loose instead of waiting on them', async () => {
    const handle = await surfaceUp();
    const socket = liveSocket(handle.address);

    await settledSocket(socket);

    const closed = new Promise((resolveClose) => {
      socket.addEventListener('close', resolveClose, { once: true });
    });

    await handle.stop();
    await closed;

    expect(socket.readyState).toBe(WebSocket.CLOSED);
  });

  it('drops a closed listener from the roster and keeps talking', async () => {
    const handle = await surfaceUp();
    const first = liveSocket(handle.address);
    const second = liveSocket(handle.address);

    await settledSocket(first);
    await settledSocket(second);

    const heard: string[] = [];

    second.addEventListener('message', (event) => {
      heard.push(String(event.data));
    });
    first.close();
    await rested(450);
    heard.length = 0;
    await writeFile(join(itemDir, 'spec.md'), '# The spec\n');
    await rested(400);
    second.close();

    expect(heard).toContain('changed');
  });
});

describe('the reuse one process gets', () => {
  it('hands back the same address while the surface lives', async () => {
    const handle = await reuseOrStartSurface(itemDir);

    open.push(handle);

    const again = await reuseOrStartSurface(itemDir);

    expect(again.address).toBe(handle.address);
  });
});

describe('the arming sentinel a foreign hand planted', () => {
  it('never writes through a foreign entry standing where the sentinel goes', async () => {
    const victimDir = await mkdtemp(join(tmpdir(), 'ket-victim-'));
    const victim = join(victimDir, 'precious.txt');

    await writeFile(victim, 'precious bytes');
    await symlink(victim, join(itemDir, '.surface-arming'));

    const handle = await surfaceUp();

    expect(await readFile(victim, 'utf8')).toBe('precious bytes');
    expect((await fetch(handle.address)).status).toBe(200);
    await rm(victimDir, { recursive: true, force: true });
  });
});
