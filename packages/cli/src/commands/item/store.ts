import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { Filing } from '../../shared/decompose.ts';
import type { Item } from '../../shared/item.ts';

import { renderBoard } from '../../shared/board.ts';
import { decompositionOf } from '../../shared/decompose.ts';
import { readStored } from '../../shared/item-store.ts';
import { renderItem } from '../../shared/item.ts';
import { keyFrom } from '../../shared/locate.ts';
import { parseItem } from '../../shared/read-item.ts';

const KET_DIRECTORY = '.ket';

const BOARD_FILE = 'BOARD.md';

const ITEM_FILE = 'item.yaml';

export async function keyOf(root: string): Promise<string> {
  const loaded: unknown = await import(join(root, KET_DIRECTORY, 'config.ts'));
  const key = keyFrom(loaded);

  if (key === undefined) {
    throw new Error(`${KET_DIRECTORY}/config.ts declares no project key`);
  }

  return key;
}

export async function itemsIn(root: string): Promise<string[]> {
  const entries = await readdir(join(root, KET_DIRECTORY, 'items'), {
    withFileTypes: true,
  }).catch(() => []);

  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
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
  const directory = join(root, KET_DIRECTORY, 'items', key);

  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, ITEM_FILE), renderItem(item), 'utf8');
  await refreshBoard(root);
}

export async function read(root: string, key: string): Promise<Item> {
  const path = join(root, KET_DIRECTORY, 'items', key, ITEM_FILE);
  const source = await readFile(path, 'utf8').catch(() => undefined);
  const item = source === undefined ? undefined : parseItem(source);

  if (item === undefined) {
    throw new Error(`${key} has no item this repository can read`);
  }

  return item;
}

export async function fileAlone(root: string, filing: Filing): Promise<void> {
  await write(root, filing.key, {
    title: filing.title,
    kind: filing.kind,
    size: filing.size,
    status: 'triaged',
    parent: undefined,
    children: [],
  });
}

export async function fileUnder(root: string, filing: Filing, parentKey: string): Promise<void> {
  const outcome = decompositionOf({ key: parentKey, item: await read(root, parentKey) }, filing);

  if ('refused' in outcome) {
    throw new Error(outcome.refused);
  }

  await write(root, filing.key, outcome.child);
  await write(root, parentKey, outcome.parent);
}
