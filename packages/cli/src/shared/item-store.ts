import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { Item } from './item.ts';
import type { StoredItem } from './read-item.ts';

import { renderBoard } from './board.ts';
import { renderItem } from './item.ts';
import { keyFrom } from './locate.ts';
import { parseItem } from './read-item.ts';

const KET_DIRECTORY = '.ket';

const ITEMS = 'items';

const ITEM_FILE = 'item.yaml';

const BOARD_FILE = 'BOARD.md';

export async function readStored(root: string): Promise<StoredItem[]> {
  const items = join(root, KET_DIRECTORY, ITEMS);
  const entries = await readdir(items, { withFileTypes: true }).catch(() => []);
  const directories = entries.filter((entry) => entry.isDirectory());

  return Promise.all(
    directories.map(async (entry) => ({
      key: entry.name,
      contents: await readFile(join(items, entry.name, ITEM_FILE), 'utf8').catch(() => ''),
    })),
  );
}

export async function keyOf(root: string): Promise<string> {
  const loaded: unknown = await import(join(root, KET_DIRECTORY, 'config.ts'));
  const key = keyFrom(loaded);

  if (key === undefined) {
    throw new Error(`${KET_DIRECTORY}/config.ts declares no project key`);
  }

  return key;
}

// The board is derived from the items, so it is rewritten wherever they are.
// Written once at create and never again, it went on saying the project had no
// items long after it had them, and a board that lies is worse than none.
async function refreshBoard(root: string): Promise<void> {
  await writeFile(
    join(root, KET_DIRECTORY, BOARD_FILE),
    renderBoard(await keyOf(root), await readStored(root)),
    'utf8',
  );
}

export async function write(root: string, key: string, item: Item): Promise<void> {
  const directory = join(root, KET_DIRECTORY, ITEMS, key);

  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, ITEM_FILE), renderItem(item), 'utf8');
  await refreshBoard(root);
}

export async function read(root: string, key: string): Promise<Item> {
  const path = join(root, KET_DIRECTORY, ITEMS, key, ITEM_FILE);
  const source = await readFile(path, 'utf8').catch(() => undefined);
  const item = source === undefined ? undefined : parseItem(source);

  if (item === undefined) {
    throw new Error(`${key} has no item this repository can read`);
  }

  return item;
}
