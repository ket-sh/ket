import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { SurfaceHandle } from './server.ts';

import { startSurface } from './server.ts';

const PUSHES = 3000;

const SILENCE = 1000;

const NUDGE = 150;

let suite = '';
let itemDir = '';
const open: SurfaceHandle[] = [];

async function fetchAsset(path: string): Promise<Response> {
  const handle = await startSurface(itemDir, {});

  open.push(handle);

  const address = new URL(handle.address);

  return fetch(`${address.origin}${path}?key=${address.searchParams.get('key') ?? ''}`);
}

beforeAll(async () => {
  suite = await mkdtemp(join(tmpdir(), 'ket-surface-assets-suite-'));
});

afterAll(async () => {
  await rm(suite, { recursive: true, force: true });
});

beforeEach(async () => {
  itemDir = await mkdtemp(join(suite, 'spec-'));
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

interface Pushes {
  came: (patience: number) => Promise<boolean>;
  settles: (quiet: number) => Promise<void>;
  forget: () => void;
}

function pushesTo(socket: WebSocket): Pushes {
  let count = 0;
  let seen = 0;
  let wake: (() => void) | undefined;

  socket.addEventListener('message', () => {
    count += 1;
    wake?.();
  });

  const came = async (patience: number): Promise<boolean> => {
    if (count > seen) {
      seen = count;

      return true;
    }

    return new Promise<boolean>((settle) => {
      const timer = setTimeout(() => {
        wake = undefined;
        settle(false);
      }, patience);

      wake = () => {
        clearTimeout(timer);
        wake = undefined;
        seen = count;
        settle(true);
      };
    });
  };

  return {
    came,
    settles: async (quiet) => {
      let stirring = true;

      while (stirring) {
        stirring = await came(quiet);
      }
    },
    forget: () => {
      seen = count;
    },
  };
}

async function listening(address: URL): Promise<{ socket: WebSocket; pushes: Pushes }> {
  const key = address.searchParams.get('key') ?? '';
  const socket = new WebSocket(`ws://127.0.0.1:${address.port}/ws?key=${key}`);
  const pushes = pushesTo(socket);

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

  return { socket, pushes };
}

// A directory watch is not armed when watch() returns, so the fixture repeats a
// change until the surface pushes for one, before it measures any silence.
async function armed(home: string, pushes: Pushes): Promise<void> {
  const deadline = Date.now() + PUSHES;
  let woke = false;

  while (!woke && Date.now() < deadline) {
    await writeFile(join(home, 'reveille.md'), String(Date.now()));
    woke = await pushes.came(NUDGE);
  }

  if (!woke) {
    throw new Error(`the surface over ${home} never pushed, so its watcher never armed`);
  }

  await pushes.settles(NUDGE);
  pushes.forget();
}

describe('the quiet the artifact route keeps', () => {
  it('never echoes its own save back as a change', async () => {
    const handle = await startSurface(itemDir, {});

    open.push(handle);

    const address = new URL(handle.address);
    const { socket, pushes } = await listening(address);
    const key = address.searchParams.get('key') ?? '';

    await armed(itemDir, pushes);

    const reply = await fetch(
      `${address.origin}/artifact?key=${key}&name=features/sample.feature`,
      { method: 'POST', body: 'Feature: Rewritten\n' },
    );

    expect(reply.status).toBe(204);
    expect(await pushes.came(SILENCE)).toBe(false);

    await writeFile(join(itemDir, 'solution-design.md'), '# The design grew\n');

    expect(await pushes.came(PUSHES)).toBe(true);

    socket.close();
  });
});
