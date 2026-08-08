import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { fileAlone, fileUnder, itemsIn, keyOf, read, write } from './store.ts';

let root = '';

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'ket-store-'));
  await mkdir(join(root, '.ket', 'items'), { recursive: true });
  await writeFile(join(root, '.ket', 'config.ts'), "export default { key: 'K' };\n");
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const ITEM = {
  title: 'The stored item',
  kind: 'feature',
  size: 'story',
  status: 'designing',
  parent: undefined,
  children: [],
} as const;

describe('the key a store answers for', () => {
  it('reads the key the config declares', async () => {
    await expect(keyOf(root)).resolves.toBe('K');
  });

  it('refuses a config that declares no key', async () => {
    await writeFile(join(root, '.ket', 'config.ts'), 'export default {};\n');

    await expect(keyOf(root)).rejects.toThrow(/no project key/);
  });
});

describe('the items a store lists', () => {
  it('lists every item directory and nothing else', async () => {
    await mkdir(join(root, '.ket', 'items', 'K-1'));
    await writeFile(join(root, '.ket', 'items', 'stray.txt'), 'not an item\n');

    await expect(itemsIn(root)).resolves.toStrictEqual(['K-1']);
  });

  it('lists nothing where no items directory exists', async () => {
    await rm(join(root, '.ket', 'items'), { recursive: true });

    await expect(itemsIn(root)).resolves.toStrictEqual([]);
  });
});

describe('what a write leaves on disk', () => {
  it('reads back the item it wrote', async () => {
    await write(root, 'K-1', { ...ITEM, children: [] });

    await expect(read(root, 'K-1')).resolves.toMatchObject({
      title: 'The stored item',
      status: 'designing',
    });
  });

  it('refreshes the board beside the items, so the board never lies', async () => {
    await write(root, 'K-1', { ...ITEM, children: [] });

    const board = await readFile(join(root, '.ket', 'BOARD.md'), 'utf8');

    expect(board).toContain('K-1');
    expect(board).toContain('The stored item');
  });

  it('refuses to read an item that is not there', async () => {
    await expect(read(root, 'K-9')).rejects.toThrow(/no item/);
  });
});

describe('what a filing writes', () => {
  it('lands a lone filing as a triaged item', async () => {
    await fileAlone(root, { key: 'K-1', title: 'Filed alone', kind: 'bug', size: 'subtask' });

    await expect(read(root, 'K-1')).resolves.toMatchObject({
      status: 'triaged',
      parent: undefined,
      children: [],
    });
  });

  it('records a child filing on both ends', async () => {
    await write(root, 'K-1', { ...ITEM, size: 'epic', children: [] });

    await fileUnder(
      root,
      { key: 'K-2', title: 'The child', kind: 'feature', size: 'story' },
      'K-1',
    );

    await expect(read(root, 'K-2')).resolves.toMatchObject({ parent: 'K-1', status: 'triaged' });
    await expect(read(root, 'K-1')).resolves.toMatchObject({ children: ['K-2'] });
  });

  it('refuses a child no parent of that size can carry', async () => {
    await write(root, 'K-1', { ...ITEM, size: 'subtask', children: [] });

    await expect(
      fileUnder(root, { key: 'K-2', title: 'Too big', kind: 'feature', size: 'epic' }, 'K-1'),
    ).rejects.toThrow();
  });
});

describe('the description a filing carries', () => {
  it('lands the description the filing was written with', async () => {
    await fileAlone(root, {
      key: 'K-1',
      title: 'Filed alone',
      kind: 'bug',
      size: 'subtask',
      description: 'Steps to reproduce\n\n1. Sign in three times with the wrong password.',
    });

    await expect(read(root, 'K-1')).resolves.toMatchObject({
      description: 'Steps to reproduce\n\n1. Sign in three times with the wrong password.',
    });
  });

  it('gives a child its own description and leaves the parent the one it had', async () => {
    await write(root, 'K-1', {
      ...ITEM,
      size: 'epic',
      children: [],
      description: 'The problem the epic answers',
    });

    await fileUnder(
      root,
      {
        key: 'K-2',
        title: 'The child',
        kind: 'feature',
        size: 'story',
        description: 'The one behavior this child ships',
      },
      'K-1',
    );

    await expect(read(root, 'K-2')).resolves.toMatchObject({
      description: 'The one behavior this child ships',
    });
    await expect(read(root, 'K-1')).resolves.toMatchObject({
      description: 'The problem the epic answers',
    });
  });
});
