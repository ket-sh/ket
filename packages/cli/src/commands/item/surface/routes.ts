import type { IncomingMessage } from 'node:http';

import { writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { text } from 'node:stream/consumers';

import type { BlastArtifact } from './blast.ts';

import { readArtifact, readBlast, readSurface } from './artifacts.ts';
import { changeDiff } from './change.ts';
import { renderBlast, renderDiagram } from './diagram.ts';
import { assemblePage } from './page.ts';
import { schemeScoped } from './skin.ts';

export interface Reply {
  status: number;
  headers: Record<string, string>;
  body: string | undefined;
}

export function refusing(status: number, why: string): Reply {
  return { status, headers: {}, body: `refused: ${why}` };
}

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

async function assetReply(path: string): Promise<Reply> {
  const assets = await assetsCarried();

  return {
    status: 200,
    headers: { 'content-type': 'text/javascript; charset=utf-8' },
    body: path === '/surface.js' ? assets.CLIENT_SCRIPT : assets.GRID_SCRIPT,
  };
}

function featureTarget(itemDir: string, name: string): string | undefined {
  const target = resolve(itemDir, name);
  const featuresDir = resolve(itemDir, 'features');

  if (!target.startsWith(`${featuresDir}/`) || !target.endsWith('.feature')) {
    return undefined;
  }

  return target;
}

async function artifactReply(
  itemDir: string,
  request: IncomingMessage,
  wroteArtifact: () => void,
): Promise<Reply> {
  const name = new URL(String(request.url), 'http://surface').searchParams.get('name') ?? '';
  const target = featureTarget(itemDir, name);

  if (target === undefined) {
    return refusing(400, `${name} is not a feature file inside the item`);
  }

  await writeFile(target, await text(request));
  wroteArtifact();

  return { status: 204, headers: {}, body: undefined };
}

async function wireframeReply(itemDir: string): Promise<Reply> {
  const wireframe = await readArtifact(itemDir, 'ui-design.html');

  if (wireframe === undefined) {
    return refusing(404, 'the item has no wireframe');
  }

  return { status: 200, headers: { 'content-type': 'text/html' }, body: wireframe };
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

async function pageReply(itemDir: string, sessionKey: string, d2Binary: string): Promise<Reply> {
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

  return { status: 200, headers: { 'content-type': 'text/html' }, body: page };
}

export async function replyTo(
  itemDir: string,
  sessionKey: string,
  d2Binary: string,
  request: IncomingMessage,
  wroteArtifact: () => void,
): Promise<Reply> {
  const path = pathOf(request);

  if (path === '/wireframe') {
    return wireframeReply(itemDir);
  }

  if (assetPath(path)) {
    return assetReply(path);
  }

  if (postsArtifact(path, request)) {
    return artifactReply(itemDir, request, wroteArtifact);
  }

  return pageReply(itemDir, sessionKey, d2Binary);
}

function rootOf(itemDir: string): string | undefined {
  const items = dirname(itemDir);
  const ket = dirname(items);

  return basename(items) === 'items' && basename(ket) === '.ket' ? dirname(ket) : undefined;
}
