import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { Filing } from './decompose.ts';
import type { Item } from './item.ts';
import type { StoredItem } from './read-item.ts';

import { CONFIGURATION_FILE, configurationIn } from './configuration-file.ts';
import { record } from './event-log.ts';
import { describing } from './item-description.ts';
import { nextKey, promotedFrom, renderItem } from './item.ts';
import { parseItem } from './read-item.ts';

const KET_DIRECTORY = '.ket';

const ITEMS = 'items';

const ITEM_FILE = 'item.yaml';

export async function itemsIn(root: string): Promise<string[]> {
  const entries = await readdir(join(root, KET_DIRECTORY, ITEMS), {
    withFileTypes: true,
  }).catch(() => []);

  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

export async function readStored(root: string): Promise<StoredItem[]> {
  const items = join(root, KET_DIRECTORY, ITEMS);
  const keys = await itemsIn(root);

  return Promise.all(
    keys.map(async (key) => ({
      key,
      contents: await readFile(join(items, key, ITEM_FILE), 'utf8').catch(() => ''),
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

export async function allocatedIn(root: string): Promise<string> {
  return nextKey(await keyOf(root), await itemsIn(root));
}

export async function arrivedAt(root: string, key: string): Promise<void> {
  await record(root, { gate: 'transition', outcome: 'allowed', about: 'triaged', item: key });
}

export async function arriveAlone(root: string, filing: Omit<Filing, 'key'>): Promise<string> {
  const key = await allocatedIn(root);

  await fileAlone(root, { ...filing, key });
  await arrivedAt(root, key);

  return key;
}

export async function fileAlone(root: string, filing: Filing): Promise<void> {
  await write(root, filing.key, {
    title: filing.title,
    kind: filing.kind,
    size: filing.size,
    status: 'triaged',
    parent: undefined,
    children: [],
    ...promotedFrom(filing.story),
    ...describing(filing.description),
  });
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
