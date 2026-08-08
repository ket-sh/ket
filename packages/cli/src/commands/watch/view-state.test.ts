import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { WatchView } from './opening.ts';

import { readView, rememberView } from './view-state.ts';

let home = '';
let root = '';

beforeEach(async () => {
  home = await mkdtemp(join(tmpdir(), 'ket-watch-home-'));
  root = await mkdtemp(join(tmpdir(), 'ket-watch-root-'));
});

afterEach(async () => {
  await rm(home, { recursive: true, force: true });
  await rm(root, { recursive: true, force: true });
});

const STOOD: WatchView = {
  layout: 'list',
  chosen: 'K-2',
  stage: { kind: 'journey', key: 'K-1', tab: 'artifacts' },
};

async function mangledEveryMemory(bytes: string): Promise<void> {
  const names = await readdir(home);

  await Promise.all(names.map(async (name) => writeFile(join(home, name), bytes)));
}

async function recalledFrom(bytes: string): Promise<WatchView | undefined> {
  rememberView(home, root, STOOD);
  await mangledEveryMemory(bytes);

  return readView(home, root);
}

describe('the view watch remembers per project', () => {
  it('reads back where the same project last stood', async () => {
    rememberView(home, root, STOOD);

    expect(await readView(home, root)).toStrictEqual(STOOD);
  });

  it('reads nothing for a project never watched', async () => {
    expect(await readView(home, root)).toBeUndefined();
  });

  it('reads back a stand on the operation log', async () => {
    const stood: WatchView = { layout: 'kanban', stage: { kind: 'oplog' } };

    rememberView(home, root, stood);

    expect(await readView(home, root)).toStrictEqual(stood);
  });

  it('reads back a stand on the docs screen', async () => {
    const stood: WatchView = { layout: 'kanban', stage: { kind: 'docs' } };

    rememberView(home, root, stood);

    expect(await readView(home, root)).toStrictEqual(stood);
  });

  it('keeps every project to its own memory', async () => {
    const other = await mkdtemp(join(tmpdir(), 'ket-watch-other-'));

    rememberView(home, root, STOOD);
    rememberView(home, other, { layout: 'backlog' });

    expect(await readView(home, root)).toStrictEqual(STOOD);
    expect(await readView(home, other)).toStrictEqual({ layout: 'backlog' });

    await rm(other, { recursive: true, force: true });
  });

  it('remembers the latest standing, not the first', async () => {
    rememberView(home, root, STOOD);
    rememberView(home, root, { layout: 'kanban' });

    expect(await readView(home, root)).toStrictEqual({ layout: 'kanban' });
  });

  it('never writes into the watched project itself', async () => {
    rememberView(home, root, STOOD);

    expect(await readdir(root)).toStrictEqual([]);
  });
});

describe('the memory watch refuses to trust', () => {
  it('reads nothing once the memory on disk is mangled', async () => {
    expect(await recalledFrom('{ mangled')).toBeUndefined();
  });

  it('reads nothing from a memory wearing a layout watch never shows', async () => {
    expect(await recalledFrom('{"layout":"sideways"}')).toBeUndefined();
  });

  it('reads nothing from a memory standing on a tab no journey shows', async () => {
    expect(
      await recalledFrom('{"stage":{"kind":"journey","key":"K-1","tab":"sideways"}}'),
    ).toBeUndefined();
  });

  it('reads nothing from a memory whose stage names no frame', async () => {
    expect(await recalledFrom('{"stage":{"kind":"nowhere"}}')).toBeUndefined();
  });

  it('reads nothing from a journey-shaped stage under a kind watch never draws', async () => {
    expect(
      await recalledFrom('{"stage":{"kind":"nowhere","key":"K-1","tab":"overview"}}'),
    ).toBeUndefined();
  });

  it('reads nothing from a memory that is no record at all', async () => {
    expect(await recalledFrom('7')).toBeUndefined();
  });

  it('reads nothing from a memory holding a bare null', async () => {
    expect(await recalledFrom('null')).toBeUndefined();
  });

  it('reads nothing from a journey memory that names no key', async () => {
    expect(await recalledFrom('{"stage":{"kind":"journey","tab":"overview"}}')).toBeUndefined();
  });

  it('reads nothing from a memory whose chosen is not a key', async () => {
    expect(await recalledFrom('{"chosen":7}')).toBeUndefined();
  });

  it('reads a bare memory as one holding nothing yet', async () => {
    expect(await recalledFrom('{}')).toStrictEqual({});
  });
});
