import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { PresetContents } from './contents.ts';
import type { PresetItem } from './item.ts';

import { everyFileOf } from './item.ts';

// Most of what a preset writes is the same whatever it governs, so those bytes
// are kept once and read from there. A preset that keeps its own copy of a path
// means it differs, and its copy is the answer.
async function bytesOf(path: string, root: string, shared: string | undefined): Promise<string> {
  const looked = shared === undefined ? [root] : [root, shared];

  for (const from of looked) {
    const kept = await readFile(join(from, path), 'utf8').catch(() => undefined);

    if (kept !== undefined) {
      return kept;
    }
  }

  throw new Error(`the preset promises ${path} and nowhere it reads from holds it`);
}

export async function shippedFilesOf(
  item: PresetItem,
  root: string,
  shared?: string,
): Promise<PresetContents> {
  const paths = everyFileOf(item)
    .map((file) => file.path)
    .toSorted();

  const read = await Promise.all(
    paths.map(async (path): Promise<[string, string]> => [path, await bytesOf(path, root, shared)]),
  );

  return Object.fromEntries(read);
}
