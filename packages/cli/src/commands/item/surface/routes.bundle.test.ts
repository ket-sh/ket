import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SurfaceHandle } from './server.ts';

interface BuildRequest {
  entrypoints: string[];
  target: string;
}

interface BundleOutcome {
  outputs: { text(): Promise<string> }[];
}

let itemDir = '';
const open: SurfaceHandle[] = [];
const priorBun = Reflect.getOwnPropertyDescriptor(globalThis, 'Bun');

function bundlerOf(build: (request: BuildRequest) => Promise<BundleOutcome>): unknown {
  return { build };
}

async function honestBundle(request: BuildRequest): Promise<BundleOutcome> {
  const [entry] = request.entrypoints;

  if (entry === undefined) {
    throw new Error('refused: the build names no entrypoint');
  }

  if (request.target !== 'browser') {
    throw new Error('refused: the build targets no browser');
  }

  const stamped = `${randomUUID()}\n${await readFile(entry, 'utf8')}`;

  return { outputs: [{ text: async () => Promise.resolve(stamped) }] };
}

async function fetchClient(runtime: unknown): Promise<Response> {
  Reflect.set(globalThis, 'Bun', runtime);
  vi.resetModules();

  const { startSurface } = await import('./server.ts');
  const handle = await startSurface(itemDir, {});

  open.push(handle);

  const address = new URL(handle.address);

  return fetch(`${address.origin}/surface.js?key=${address.searchParams.get('key') ?? ''}`);
}

beforeEach(async () => {
  itemDir = await mkdtemp(join(tmpdir(), 'ket-surface-bundle-'));
  await writeFile(join(itemDir, 'item.yaml'), 'title: The sample item\nstatus: verifying\n');
});

afterEach(async () => {
  if (priorBun === undefined) {
    Reflect.deleteProperty(globalThis, 'Bun');
  } else {
    Object.defineProperty(globalThis, 'Bun', priorBun);
  }

  await Promise.all(open.splice(0).map(async (handle) => handle.stop()));
  await rm(itemDir, { recursive: true, force: true });
});

describe('the client bundle a bundling runtime serves', () => {
  it('bundles the surface client from its entry as javascript', async () => {
    const reply = await fetchClient(bundlerOf(honestBundle));

    expect(reply.status).toBe(200);
    expect(reply.headers.get('content-type')).toContain('javascript');
    expect(await reply.text()).toContain('wireAudience');
  });

  it('serves every request the very same bundle', async () => {
    const reply = await fetchClient(bundlerOf(honestBundle));
    const first = await reply.text();
    const address = new URL(open[0]?.address ?? '');
    const again = await fetch(
      `${address.origin}/surface.js?key=${address.searchParams.get('key') ?? ''}`,
    );

    expect(await again.text()).toBe(first);
  });

  it('refuses when the bundle comes out empty', async () => {
    Reflect.set(
      globalThis,
      'Bun',
      bundlerOf(async () => Promise.resolve({ outputs: [] })),
    );
    vi.resetModules();

    const { respond } = await import('./routes.ts');
    const request = new IncomingMessage(new Socket());

    request.url = '/surface.js?key=k-9';

    const response = new ServerResponse(request);
    const answering = respond(itemDir, 'k-9', 'd2', request, response, () => {});

    await expect(answering).rejects.toThrow('the client bundle came out empty');
  });

  it('refuses a runtime whose bundler keeps no contract', async () => {
    const reply = await fetchClient({ build: 'not callable' });

    expect(reply.status).toBe(501);
    expect(await reply.text()).toContain('serves under bun');
  });
});
