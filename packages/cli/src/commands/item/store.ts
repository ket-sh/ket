import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

import type { Filing } from '../../shared/decompose.ts';

import { decompositionOf } from '../../shared/decompose.ts';
import { keyOf, read, write } from '../../shared/item-store.ts';

const KET_DIRECTORY = '.ket';

export { keyOf, read, write };

export async function itemsIn(root: string): Promise<string[]> {
  const entries = await readdir(join(root, KET_DIRECTORY, 'items'), {
    withFileTypes: true,
  }).catch(() => []);

  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
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
