import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SurfaceHandle } from './server.ts';

let itemDir = '';
const open: SurfaceHandle[] = [];

beforeEach(async () => {
  itemDir = await mkdtemp(join(tmpdir(), 'ket-surface-exit-'));
  await writeFile(join(itemDir, 'item.yaml'), 'title: The exiting item\nstatus: triaged\n');
  await mkdir(join(itemDir, 'features'));
});

afterEach(async () => {
  Reflect.deleteProperty(globalThis, 'Bun');
  await Promise.all(open.splice(0).map(async (handle) => handle.stop()));
  await rm(itemDir, { recursive: true, force: true });
});

describe('the exit a stopped surface allows', () => {
  it('lets the process go the moment the surface stops', async () => {
    const fresh = await import('./server.ts');
    const warmup = await fresh.startSurface(itemDir);

    await warmup.stop();

    const serverModule = fileURLToPath(new URL('server.ts', import.meta.url));
    const script = `import { startSurface } from '${serverModule}';

const handle = await startSurface('${itemDir}');

await handle.stop();
process.stdout.write('stopped');
`;
    const scriptPath = join(itemDir, 'exit-probe.mts');

    await writeFile(scriptPath, script);

    const answer = await new Promise<{ out: string; failed: boolean }>((resolveRun) => {
      execFile('node', [scriptPath], { timeout: 5000 }, (failed, stdout) => {
        resolveRun({ out: stdout, failed: failed !== null });
      });
    });

    expect(answer.failed).toBe(false);
    expect(answer.out).toBe('stopped');
  }, 10000);
});

describe('the info file a recycled pid forged', () => {
  it('starts fresh instead of adopting its own ghost', async () => {
    vi.resetModules();

    const fresh = await import('./server.ts');

    await writeFile(
      join(itemDir, '.surface.json'),
      JSON.stringify({ address: 'http://127.0.0.1:1/?key=stale', port: 1, pid: process.pid }),
    );

    const handle = await fresh.reuseOrStartSurface(itemDir);

    open.push(handle);

    expect(handle.port).not.toBe(1);

    const reply = await fetch(handle.address);

    expect(reply.status).toBe(200);
  });
});

describe('the failure after the headers left', () => {
  it('keeps the server standing when the bundle stream dies mid-answer', async () => {
    Reflect.set(globalThis, 'Bun', {
      build: async (): Promise<{ outputs: { text: () => Promise<string> }[] }> => {
        await Promise.resolve();

        return {
          outputs: [
            {
              text: async (): Promise<string> => {
                await Promise.resolve();

                throw new Error('the stream died');
              },
            },
          ],
        };
      },
    });

    const fresh = await import('./server.ts');
    const handle = await fresh.startSurface(itemDir);

    open.push(handle);

    const address = new URL(handle.address);
    const key = address.searchParams.get('key') ?? '';
    const reaper = new AbortController();
    const poisoned = fetch(`${address.origin}/surface.js?key=${key}`, {
      signal: reaper.signal,
    }).catch(() => undefined);

    await new Promise((rested) => {
      setTimeout(rested, 300);
    });

    const reply = await fetch(`${address.origin}/gridstack.js?key=${key}`);

    expect(reply.status).toBe(200);
    reaper.abort();
    await poisoned;
  });
});
