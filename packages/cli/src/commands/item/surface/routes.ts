import type { IncomingMessage, ServerResponse } from 'node:http';

import { writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { text } from 'node:stream/consumers';

import type { BlastArtifact } from './blast.ts';

import { readArtifact, readBlast, readSurface } from './artifacts.ts';
import { changeDiff } from './change.ts';
import { renderBlast, renderDiagram } from './diagram.ts';
import { assemblePage } from './page.ts';
import { schemeScoped } from './skin.ts';

export function keyOf(request: IncomingMessage): string {
  return new URL(String(request.url), 'http://surface').searchParams.get('key') ?? '';
}

export function pathOf(request: IncomingMessage): string {
  return new URL(String(request.url), 'http://surface').pathname;
}

// The embedded assets weigh close to a megabyte, so only the requests that
// serve them pay for loading the module the generator bakes them into.
let carriedAssets: Promise<typeof import('./styles.generated.ts')> | undefined;

async function assetsCarried(): Promise<typeof import('./styles.generated.ts')> {
  carriedAssets ??= import('./styles.generated.ts');

  return carriedAssets;
}

let chromeStyles: Promise<string> | undefined;

async function stylesChrome(): Promise<string> {
  chromeStyles ??= assetsCarried().then(
    (carried) =>
      `${schemeScoped(carried.DIFF_STYLES)}\n${carried.GRID_STYLES}\n${carried.SURFACE_STYLES}`,
  );

  return chromeStyles;
}

async function serveAsset(path: string, response: ServerResponse): Promise<void> {
  const assets = await assetsCarried();
  const carried = path === '/surface.js' ? assets.CLIENT_SCRIPT : assets.GRID_SCRIPT;

  response.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' }).end(carried);
}

function featureTarget(itemDir: string, name: string): string | undefined {
  const target = resolve(itemDir, name);
  const featuresDir = resolve(itemDir, 'features');

  if (!target.startsWith(`${featuresDir}/`) || !target.endsWith('.feature')) {
    return undefined;
  }

  return target;
}

async function acceptArtifact(
  itemDir: string,
  request: IncomingMessage,
  response: ServerResponse,
  wroteArtifact: () => void,
): Promise<void> {
  const name = new URL(String(request.url), 'http://surface').searchParams.get('name') ?? '';
  const target = featureTarget(itemDir, name);

  if (target === undefined) {
    response.writeHead(400).end(`refused: ${name} is not a feature file inside the item`);

    return;
  }

  await writeFile(target, await text(request));
  wroteArtifact();
  response.writeHead(204).end();
}

async function serveWireframe(itemDir: string, response: ServerResponse): Promise<void> {
  const wireframe = await readArtifact(itemDir, 'ui-design.html');

  if (wireframe === undefined) {
    response.writeHead(404).end('refused: the item has no wireframe');
  } else {
    response.writeHead(200, { 'content-type': 'text/html' }).end(wireframe);
  }
}

function assetPath(path: string): boolean {
  return path === '/gridstack.js' || path === '/surface.js';
}

function postsArtifact(path: string, request: IncomingMessage): boolean {
  return path === '/artifact' && request.method === 'POST';
}

async function blastOf(itemDir: string, d2Binary: string): Promise<BlastArtifact | undefined> {
  const files = await readBlast(itemDir);

  if (files === undefined) {
    return undefined;
  }

  return { ...files, render: await renderBlast(itemDir, d2Binary) };
}

async function servePage(
  itemDir: string,
  sessionKey: string,
  d2Binary: string,
  response: ServerResponse,
): Promise<void> {
  const surface = await readSurface(itemDir);
  const projectRoot = rootOf(itemDir);
  const page = assemblePage(
    {
      ...surface,
      artifacts: {
        ...surface.artifacts,
        diagram: await renderDiagram(itemDir, d2Binary),
        blast: await blastOf(itemDir, d2Binary),
        diff: projectRoot === undefined ? undefined : await changeDiff(projectRoot),
      },
    },
    { sessionKey, styles: await stylesChrome() },
  );

  response.writeHead(200, { 'content-type': 'text/html' }).end(page);
}

export async function respond(
  itemDir: string,
  sessionKey: string,
  d2Binary: string,
  request: IncomingMessage,
  response: ServerResponse,
  wroteArtifact: () => void,
): Promise<void> {
  const path = pathOf(request);

  if (path === '/wireframe') {
    await serveWireframe(itemDir, response);

    return;
  }

  if (assetPath(path)) {
    await serveAsset(path, response);

    return;
  }

  if (postsArtifact(path, request)) {
    await acceptArtifact(itemDir, request, response, wroteArtifact);

    return;
  }

  await servePage(itemDir, sessionKey, d2Binary, response);
}

function rootOf(itemDir: string): string | undefined {
  const items = dirname(itemDir);
  const ket = dirname(items);

  return basename(items) === 'items' && basename(ket) === '.ket' ? dirname(ket) : undefined;
}
