import type { IncomingMessage, ServerResponse } from 'node:http';

import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { basename, dirname, resolve } from 'node:path';
import { text } from 'node:stream/consumers';
import { fileURLToPath } from 'node:url';

import { readArtifact, readSurface } from './artifacts.ts';
import { changeDiff } from './change.ts';
import { renderDiagram } from './diagram.ts';
import { assemblePage } from './page.ts';
import { schemeScoped } from './skin.ts';

export function keyOf(request: IncomingMessage): string {
  return new URL(String(request.url), 'http://surface').searchParams.get('key') ?? '';
}

export function pathOf(request: IncomingMessage): string {
  return new URL(String(request.url), 'http://surface').pathname;
}

const resolveModulePath = createRequire(import.meta.url).resolve;

let chromeStyles: Promise<string> | undefined;

async function stylesChrome(): Promise<string> {
  chromeStyles ??= Promise.all([
    readFile(fileURLToPath(new URL('surface.css', import.meta.url)), 'utf8'),
    readFile(resolveModulePath('diff2html/bundles/css/diff2html.min.css'), 'utf8'),
    readFile(resolveModulePath('gridstack/dist/gridstack.min.css'), 'utf8'),
  ]).then(([surface, diff, grid]) => `${schemeScoped(diff)}\n${grid}\n${surface}`);

  return chromeStyles;
}

const scripts = new Map<string, Promise<string>>();

interface BundleMaker {
  build(options: { entrypoints: string[]; target: string }): Promise<{
    outputs: { text(): Promise<string> }[];
  }>;
}

function isBundleMaker(held: unknown): held is BundleMaker {
  return (
    typeof held === 'object' && held !== null && 'build' in held && typeof held.build === 'function'
  );
}

function bundleMaker(): BundleMaker | undefined {
  const held: unknown = Reflect.get(globalThis, 'Bun');

  return isBundleMaker(held) ? held : undefined;
}

async function bundledClient(maker: BundleMaker): Promise<string> {
  const entry = fileURLToPath(new URL('client/main.ts', import.meta.url));
  const built = await maker.build({ entrypoints: [entry], target: 'browser' });
  const output = built.outputs[0];

  if (output === undefined) {
    throw new Error('refused: the client bundle came out empty');
  }

  return output.text();
}

async function serveClient(response: ServerResponse): Promise<void> {
  const maker = bundleMaker();

  if (maker === undefined) {
    response.writeHead(501).end('refused: the surface client serves under bun');

    return;
  }

  const held = scripts.get('/surface.js') ?? bundledClient(maker);

  scripts.set('/surface.js', held);
  response.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' }).end(await held);
}

async function serveAsset(path: string, response: ServerResponse): Promise<void> {
  if (path === '/surface.js') {
    await serveClient(response);

    return;
  }

  const source = resolveModulePath('gridstack/dist/gridstack-all.js');
  const held = scripts.get(path) ?? readFile(source, 'utf8');

  scripts.set(path, held);
  response.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' }).end(await held);
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
