import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { WebSocket } from 'ws';

import { randomBytes } from 'node:crypto';
import { watch } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { basename, resolve } from 'node:path';
import { text } from 'node:stream/consumers';
import { WebSocketServer } from 'ws';

import { readArtifact, readSurface } from './artifacts.ts';
import { alive, readInfo, removeInfo, signalForeign, writeInfo } from './info.ts';
import { assemblePage } from './page.ts';

export interface SurfaceOptions {
  idleMs?: number;
}

export interface SurfaceHandle {
  address: string;
  port: number;
  stop(): Promise<void>;
}

const FOUR_HOURS = 4 * 60 * 60 * 1000;

const running = new Map<string, SurfaceHandle>();

function keyOf(request: IncomingMessage): string {
  return new URL(request.url ?? '/', 'http://surface').searchParams.get('key') ?? '';
}

function pathOf(request: IncomingMessage): string {
  return new URL(request.url ?? '/', 'http://surface').pathname;
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
): Promise<void> {
  const name = new URL(request.url ?? '/', 'http://surface').searchParams.get('name') ?? '';
  const target = featureTarget(itemDir, name);

  if (target === undefined) {
    response.writeHead(400).end(`refused: ${name} is not a feature file inside the item`);

    return;
  }

  await writeFile(target, await text(request));
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

async function respond(
  itemDir: string,
  sessionKey: string,
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  const path = pathOf(request);

  if (path === '/wireframe') {
    await serveWireframe(itemDir, response);

    return;
  }

  if (path === '/artifact' && request.method === 'POST') {
    await acceptArtifact(itemDir, request, response);

    return;
  }

  const page = assemblePage(await readSurface(itemDir), { sessionKey });

  response.writeHead(200, { 'content-type': 'text/html' }).end(page);
}

function watching(itemDir: string, changed: () => void): () => void {
  let pending: ReturnType<typeof setTimeout> | undefined;
  const watcher = watch(itemDir, { recursive: true }, (_, filename) => {
    if (typeof filename === 'string' && basename(filename).startsWith('.')) {
      return;
    }

    clearTimeout(pending);
    pending = setTimeout(changed, 100);
  });

  return () => {
    clearTimeout(pending);
    watcher.close();
  };
}

function idleTimer(onIdle: () => void, idleMs: number): { rest(): void; clear(): void } {
  let timer: ReturnType<typeof setTimeout> | undefined;

  return {
    rest() {
      clearTimeout(timer);
      timer = setTimeout(onIdle, idleMs);
    },
    clear() {
      clearTimeout(timer);
    },
  };
}

function attachSockets(server: Server, sessionKey: string, clients: Set<WebSocket>): void {
  const sockets = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    if (keyOf(request) !== sessionKey || pathOf(request) !== '/ws') {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();

      return;
    }

    sockets.handleUpgrade(request, socket, head, (client) => {
      clients.add(client);
      client.on('close', () => {
        clients.delete(client);
      });
    });
  });
}

async function listenLoopback(server: Server): Promise<number> {
  await new Promise<void>((resolveListen) => {
    server.listen(0, '127.0.0.1', () => {
      resolveListen();
    });
  });

  const bound = server.address();

  return typeof bound === 'object' && bound !== null ? bound.port : 0;
}

async function closeServer(server: Server): Promise<void> {
  server.closeAllConnections();
  await new Promise<void>((resolveClose) => {
    server.close(() => {
      resolveClose();
    });
  });
}

export async function startSurface(
  itemDir: string,
  options: SurfaceOptions = {},
): Promise<SurfaceHandle> {
  const home = resolve(itemDir);
  const sessionKey = randomBytes(24).toString('base64url');
  const clients = new Set<WebSocket>();
  let stopped = false;

  const idle = idleTimer(() => {
    void stop();
  }, options.idleMs ?? FOUR_HOURS);

  const server: Server = createServer((request, response) => {
    if (keyOf(request) !== sessionKey) {
      response.writeHead(403).end('refused: missing or wrong session key');

      return;
    }

    idle.rest();
    void respond(home, sessionKey, request, response);
  });

  attachSockets(server, sessionKey, clients);

  const stopWatching = watching(home, () => {
    idle.rest();

    for (const client of clients) {
      client.send('changed');
    }
  });

  const stop = async (): Promise<void> => {
    if (stopped) {
      return;
    }

    stopped = true;
    idle.clear();
    stopWatching();

    for (const client of clients) {
      client.terminate();
    }

    await closeServer(server);
    await removeInfo(home);
    running.delete(home);
  };

  const port = await listenLoopback(server);
  const address = `http://127.0.0.1:${String(port)}/?key=${sessionKey}`;
  const handle: SurfaceHandle = { address, port, stop };

  idle.rest();
  await writeInfo(home, { address, port, pid: process.pid });
  running.set(home, handle);

  return handle;
}

async function adoptForeign(home: string): Promise<SurfaceHandle | undefined> {
  const info = await readInfo(home);

  if (info === undefined || info.pid === process.pid || !alive(info.pid)) {
    return undefined;
  }

  return {
    address: info.address,
    port: info.port,
    stop: async () => stopSurface(home),
  };
}

export async function reuseOrStartSurface(
  itemDir: string,
  options: SurfaceOptions = {},
): Promise<SurfaceHandle> {
  const home = resolve(itemDir);

  return running.get(home) ?? (await adoptForeign(home)) ?? startSurface(home, options);
}

export async function stopSurface(itemDir: string): Promise<void> {
  const home = resolve(itemDir);
  const held = running.get(home);

  if (held !== undefined) {
    await held.stop();

    return;
  }

  signalForeign(await readInfo(home));
  await removeInfo(home);
}
