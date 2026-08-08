import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { Item } from './item.ts';
import type { StoredItem } from './read-item.ts';

import { CONFIGURATION_FILE, configurationIn } from './configuration-file.ts';
import { renderItem } from './item.ts';
import { parseItem } from './read-item.ts';

const KET_DIRECTORY = '.ket';

const ITEMS = 'items';

const ITEM_FILE = 'item.yaml';

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
  const reading = await configurationIn(root);

  if (!('configuration' in reading)) {
    throw new Error(
      `${KET_DIRECTORY}/${CONFIGURATION_FILE} declares no project key, so nothing says how to name an item`,
    );
  }

  return reading.configuration.key;
}

export async function write(root: string, key: string, item: Item): Promise<void> {
  const directory = join(root, KET_DIRECTORY, ITEMS, key);

  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, ITEM_FILE), renderItem(item), 'utf8');
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
