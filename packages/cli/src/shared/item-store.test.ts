import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { readStored } from './item-store.ts';

async function repository(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'ket-'));
}

async function itemAt(root: string, key: string, contents: string): Promise<void> {
  await mkdir(join(root, '.ket', 'items', key), { recursive: true });
  await writeFile(join(root, '.ket', 'items', key, 'item.yaml'), contents, 'utf8');
}

describe('reading the items a repository holds', () => {
  it('reads each one under the key its directory carries', async () => {
    const root = await repository();

    await itemAt(root, 'OS-1', 'title: login\n');

    await expect(readStored(root)).resolves.toStrictEqual([
      { key: 'OS-1', contents: 'title: login\n' },
    ]);
  });

  it('reads every item, not only the first', async () => {
    const root = await repository();

    await itemAt(root, 'OS-1', 'title: login\n');
    await itemAt(root, 'OS-2', 'title: logout\n');

    const keys = (await readStored(root)).map((stored) => stored.key).toSorted();

    expect(keys).toStrictEqual(['OS-1', 'OS-2']);
  });

  it('holds nothing where no item has been filed yet', async () => {
    await expect(readStored(await repository())).resolves.toStrictEqual([]);
  });

  it('hands back an item it cannot read as empty, so nothing waves a write through', async () => {
    const root = await repository();

    await mkdir(join(root, '.ket', 'items', 'OS-1'), { recursive: true });

    await expect(readStored(root)).resolves.toStrictEqual([{ key: 'OS-1', contents: '' }]);
  });

  it('reads the item directories, and a stray file beside them is not one', async () => {
    const root = await repository();

    await itemAt(root, 'OS-1', 'title: login\n');
    await writeFile(join(root, '.ket', 'items', 'README.md'), 'notes\n', 'utf8');

    const keys = (await readStored(root)).map((stored) => stored.key);

    expect(keys).toStrictEqual(['OS-1']);
  });
});
