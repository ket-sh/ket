import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { PresetContents } from './contents.ts';
import type { PresetFile, PresetItem } from './item.ts';

import { everyFileOf } from './item.ts';

// Most of what a preset writes is the same whatever it governs, so those bytes
// are kept once and read from there. A preset that keeps its own copy of a path
// means it differs, and its copy is the answer.
async function bytesOf(
  file: PresetFile,
  root: string,
  shared: string | undefined,
): Promise<string> {
  const looked = shared === undefined ? [root] : [root, shared];

  for (const from of looked) {
    const kept = await readFile(join(from, file.path)).catch(() => undefined);

    if (kept !== undefined) {
      return file.encoding === 'base64' ? kept.toString('base64') : kept.toString('utf8');
    }
  }

  throw new Error(`the preset promises ${file.path} and nowhere it reads from holds it`);
}

export async function shippedFilesOf(
  item: PresetItem,
  root: string,
  shared?: string,
): Promise<PresetContents> {
  const byPath = new Map(everyFileOf(item).map((file) => [file.path, file] as const));
  const paths = [...byPath.keys()].toSorted();
  const entries = [...byPath.entries()];
  const files = paths.flatMap((path) =>
    entries.filter(([held]) => held === path).map(([, file]) => file),
  );

  const read = await Promise.all(
    files.map(
      async (file): Promise<[string, string]> => [file.path, await bytesOf(file, root, shared)],
    ),
  );

  return Object.fromEntries(read);
}
