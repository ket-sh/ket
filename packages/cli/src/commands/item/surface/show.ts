import { join } from 'node:path';

import type { SurfaceHandle } from './server.ts';

import { readArtifact } from './artifacts.ts';
import { reuseOrStartSurface } from './server.ts';

export function surfaceItemDir(root: string, key: string): string {
  return join(root, '.ket', 'items', key);
}

export async function itemDirOrThrow(root: string, key: string): Promise<string> {
  const itemDir = surfaceItemDir(root, key);
  const manifest = await readArtifact(itemDir, 'item.yaml');

  if (manifest === undefined) {
    throw new Error(`${key} has no item this repository can read`);
  }

  return itemDir;
}

export async function showSurface(
  root: string,
  key: string,
  opener?: (address: string) => void,
): Promise<SurfaceHandle> {
  const itemDir = await itemDirOrThrow(root, key);
  const handle = await reuseOrStartSurface(itemDir);

  opener?.(handle.address);

  return handle;
}
