import { mkdtemp, mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { IncomingMessage } from 'node:http';
import { Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { SurfaceHandle } from './server.ts';

import { keyOf, pathOf } from './routes.ts';
import { startSurface } from './server.ts';

let baseDir = '';
let itemDir = '';
const open: SurfaceHandle[] = [];

function requestOf(url: string): IncomingMessage {
  const request = new IncomingMessage(new Socket());

  request.url = url;

  return request;
}

async function surfaceOrigin(): Promise<{ origin: string; key: string }> {
  const handle = await startSurface(itemDir, {});

  open.push(handle);

  const address = new URL(handle.address);

  return { origin: address.origin, key: address.searchParams.get('key') ?? '' };
}

async function postArtifact(query: string): Promise<Response> {
  const { origin, key } = await surfaceOrigin();

  return fetch(`${origin}/artifact?key=${key}${query}`, {
    method: 'POST',
    body: 'Feature: Smuggled\n',
  });
}

async function absent(path: string): Promise<boolean> {
  return stat(path).then(
    () => false,
    () => true,
  );
}

beforeEach(async () => {
  baseDir = await mkdtemp(join(tmpdir(), 'ket-surface-artifact-'));
  itemDir = join(baseDir, 'item');
  await mkdir(join(itemDir, 'features'), { recursive: true });
  await writeFile(join(itemDir, 'item.yaml'), 'title: The sample item\nstatus: verifying\n');
});

afterEach(async () => {
  await Promise.all(open.splice(0).map(async (handle) => handle.stop()));
  await rm(baseDir, { recursive: true, force: true });
});

describe('the key a bare request carries', () => {
  it('reads no key from an address that names none', () => {
    expect(keyOf(requestOf('/wireframe'))).toBe('');
    expect(pathOf(requestOf('/wireframe'))).toBe('/wireframe');
  });

  it('reads the key straight from the address', () => {
    expect(keyOf(requestOf('/?key=k-9'))).toBe('k-9');
  });
});

describe('the writes the artifact route refuses', () => {
  it('refuses a feature parked outside the features directory', async () => {
    const reply = await postArtifact('&name=stray.feature');

    expect(reply.status).toBe(400);
    expect(await absent(join(itemDir, 'stray.feature'))).toBe(true);
  });

  it('refuses a feature climbing out of the item', async () => {
    const reply = await postArtifact(`&name=${encodeURIComponent('../outside.feature')}`);

    expect(reply.status).toBe(400);
    expect(await absent(join(baseDir, 'outside.feature'))).toBe(true);
  });

  it('names the refused artifact in the refusal', async () => {
    const reply = await postArtifact('');

    expect(reply.status).toBe(400);
    expect(await reply.text()).toBe('refused:  is not a feature file inside the item');
  });
});

describe('the artifact address off its method', () => {
  it('serves the page to a read of the artifact address', async () => {
    const { origin, key } = await surfaceOrigin();
    const reply = await fetch(`${origin}/artifact?key=${key}&name=features/any.feature`);

    expect(reply.status).toBe(200);
    expect(await reply.text()).toContain('<!doctype html>');
  });

  it('serves the page to a post anywhere else', async () => {
    const { origin, key } = await surfaceOrigin();
    const reply = await fetch(`${origin}/?key=${key}`, { method: 'POST', body: 'noise' });

    expect(reply.status).toBe(200);
    expect(await reply.text()).toContain('<!doctype html>');
  });
});

describe('the answers the surface types', () => {
  it('tells the reader the item has no wireframe', async () => {
    const { origin, key } = await surfaceOrigin();
    const reply = await fetch(`${origin}/wireframe?key=${key}`);

    expect(reply.status).toBe(404);
    expect(await reply.text()).toContain('the item has no wireframe');
  });

  it('hands the wireframe over as html', async () => {
    await writeFile(join(itemDir, 'ui-design.html'), '<html><body>the mock</body></html>');

    const { origin, key } = await surfaceOrigin();
    const reply = await fetch(`${origin}/wireframe?key=${key}`);

    expect(reply.headers.get('content-type')).toContain('text/html');
  });

  it('hands the page over as html', async () => {
    const { origin, key } = await surfaceOrigin();
    const reply = await fetch(`${origin}/?key=${key}`);

    expect(reply.headers.get('content-type')).toContain('text/html');
  });
});
