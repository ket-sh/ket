import type { ChildProcess } from 'node:child_process';

import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { SurfaceInfo } from './info.ts';

import { alive, readInfo, removeInfo, signalForeign, writeInfo } from './info.ts';

let itemDir = '';

const storedInfo: SurfaceInfo = {
  address: 'http://127.0.0.1:4100/?key=stored',
  port: 4100,
  pid: 4242,
};

function pidOf(child: ChildProcess): number {
  const pid = child.pid;

  if (pid === undefined) {
    throw new Error('the helper process reported no pid');
  }

  return pid;
}

function sleeper(): ChildProcess {
  return spawn(process.execPath, ['-e', 'setTimeout(() => {}, 30000)']);
}

async function exitedWithin(child: ChildProcess, ms: number): Promise<boolean> {
  return new Promise((resolve) => {
    const cutoff = setTimeout(() => {
      resolve(false);
    }, ms);

    child.once('exit', () => {
      clearTimeout(cutoff);
      resolve(true);
    });
  });
}

async function exitedPid(): Promise<number> {
  const child = spawn(process.execPath, ['-e', '']);

  await new Promise((resolve) => {
    child.once('exit', resolve);
  });

  return pidOf(child);
}

beforeEach(async () => {
  itemDir = await mkdtemp(join(tmpdir(), 'ket-info-'));
});

afterEach(async () => {
  await rm(itemDir, { recursive: true, force: true });
});

describe('the info file a surface writes', () => {
  it('stores the address, the port, and the pid as JSON in .surface.json', async () => {
    await writeInfo(itemDir, storedInfo);

    const raw = await readFile(join(itemDir, '.surface.json'), 'utf8');
    const written: unknown = JSON.parse(raw);

    expect(written).toEqual({
      address: 'http://127.0.0.1:4100/?key=stored',
      port: 4100,
      pid: 4242,
    });
  });

  it('reads back the info it stored', async () => {
    await writeInfo(itemDir, storedInfo);

    expect(await readInfo(itemDir)).toEqual(storedInfo);
  });

  it('reads no info from an item that never had a surface', async () => {
    expect(await readInfo(itemDir)).toBeUndefined();
  });

  it('removes the info it stored', async () => {
    await writeInfo(itemDir, storedInfo);
    await removeInfo(itemDir);

    expect(await readInfo(itemDir)).toBeUndefined();
  });

  it('removes nothing without complaint when no info exists', async () => {
    await expect(removeInfo(itemDir)).resolves.toBeUndefined();
  });
});

describe('the info content a reader refuses', () => {
  const foreignContents = [
    'not even json',
    'null',
    '"street"',
    '{}',
    '{"pid":3}',
    '{"port":1,"pid":2}',
    '{"address":"a","port":1}',
    '{"address":7,"port":"p","pid":true}',
  ];

  it.each(foreignContents)('reads no surface from an info file holding %s', async (content) => {
    await writeFile(join(itemDir, '.surface.json'), content);

    expect(await readInfo(itemDir)).toBeUndefined();
  });
});

describe('the liveness the signal relies on', () => {
  it('sees the calling process as alive', () => {
    expect(alive(process.pid)).toBe(true);
  });

  it('sees an exited process as dead, never as undecided', async () => {
    expect(alive(await exitedPid())).toBe(false);
  });
});

describe('the signal a foreign surface receives', () => {
  it('signals the live process a foreign info names', async () => {
    const child = sleeper();

    try {
      signalForeign({ address: 'http://127.0.0.1:4199/?key=f', port: 4199, pid: pidOf(child) });

      expect(await exitedWithin(child, 2000)).toBe(true);
    } finally {
      child.kill('SIGKILL');
    }
  });

  it('leaves the calling process alone when the info names it', async () => {
    let signaled = false;

    const trap = (): void => {
      signaled = true;
    };

    process.on('SIGTERM', trap);

    try {
      signalForeign({ address: 'http://127.0.0.1:4198/?key=self', port: 4198, pid: process.pid });
      await new Promise((resolve) => {
        setTimeout(resolve, 100);
      });

      expect(signaled).toBe(false);
    } finally {
      process.removeListener('SIGTERM', trap);
    }
  });

  it('signals nothing when no info was stored', () => {
    expect(() => {
      signalForeign(undefined);
    }).not.toThrow();
  });

  it('signals nothing for an info naming a dead process', async () => {
    const dead = await exitedPid();

    expect(() => {
      signalForeign({ address: 'http://127.0.0.1:4197/?key=dead', port: 4197, pid: dead });
    }).not.toThrow();
  });
});
