import type { Server, ServerResponse } from 'node:http';
import type { WebSocket } from 'ws';

import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { WebSocketServer } from 'ws';

import type { QuietGate } from './quiet.ts';
import type { Reply } from './routes.ts';

import { alive, readInfo, removeInfo, signalForeign, writeInfo } from './info.ts';
import { quietGate } from './quiet.ts';
import { keyOf, pathOf, refusing, replyTo } from './routes.ts';
import { watching } from './watch.ts';

export interface SurfaceOptions {
  idleMs?: number;
  d2Binary?: string;
  armingMs?: number;
}

export interface SurfaceHandle {
  address: string;
  port: number;
  stop(): Promise<void>;
}

const FOUR_HOURS = 14_400_000;
const ARMING_BOUND_MS = 10_000;

const running = new Map<string, SurfaceHandle>();

function send(response: ServerResponse, reply: Reply): void {
  response.writeHead(reply.status, reply.headers).end(reply.body);
}

function refusalFor(failed: unknown): Reply {
  return refusing(500, failed instanceof Error ? failed.message : String(failed));
}

function idleTimer(onIdle: () => void, idleMs: number): { rest(): void } {
  let timer: ReturnType<typeof setTimeout> | undefined;

  return {
    rest() {
      clearTimeout(timer);
      timer = setTimeout(onIdle, idleMs);
      timer.unref();
    },
  };
}

function pushingChanges(
  clients: Set<WebSocket>,
  idle: { rest(): void },
  quiet: QuietGate,
): () => void {
  return () => {
    idle.rest();

    if (!quiet.loud()) {
      return;
    }

    for (const client of clients) {
      client.send('changed');
    }
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
  const quiet = quietGate();

  const idle = idleTimer(() => {
    void stop();
  }, options.idleMs ?? FOUR_HOURS);

  const server: Server = createServer((request, response) => {
    if (keyOf(request) !== sessionKey) {
      send(response, refusing(403, 'missing or wrong session key'));

      return;
    }

    idle.rest();
    void replyTo(home, sessionKey, options.d2Binary ?? 'd2', request, quiet.hush)
      .catch(refusalFor)
      .then((reply) => {
        send(response, reply);
      });
  });

  attachSockets(server, sessionKey, clients);

  const stopWatching = await watching(
    home,
    pushingChanges(clients, idle, quiet),
    options.armingMs ?? ARMING_BOUND_MS,
  );

  const stop = async (): Promise<void> => {
    stopWatching.close();
    await stopWatching.closed;

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

async function answering(address: string): Promise<boolean> {
  try {
    const reply = await fetch(address, { signal: AbortSignal.timeout(1500) });

    return reply.ok;
  } catch {
    return false;
  }
}

async function adoptForeign(home: string): Promise<SurfaceHandle | undefined> {
  const info = await readInfo(home);

  if (info === undefined || info.pid === process.pid || !alive(info.pid)) {
    return undefined;
  }

  if (!(await answering(info.address))) {
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
