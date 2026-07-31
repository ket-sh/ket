import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { StoredItem } from './read-item.ts';

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
