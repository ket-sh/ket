import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { PresetContents } from './contents.ts';
import type { PresetItem } from './item.ts';

import { everyFileOf } from './item.ts';

export async function shippedFilesOf(item: PresetItem, root: string): Promise<PresetContents> {
  const paths = everyFileOf(item)
    .map((file) => file.path)
    .toSorted();

  const read = await Promise.all(
    paths.map(
      async (path): Promise<[string, string]> => [path, await readFile(join(root, path), 'utf8')],
    ),
  );

  return Object.fromEntries(read);
}
