import { readdir } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

import { refuseNameSegment } from './name.ts';
import { deriveProjectKey } from './project-key.ts';

export const KET_DIRECTORY = '.ket';

export interface CreationPlan {
  root: string;
  key: string | undefined;
}

async function entriesIn(directory: string): Promise<string[]> {
  return readdir(directory).catch(() => []);
}

export async function planCreation(where: string): Promise<CreationPlan> {
  const root = resolve(where);
  const name = basename(root);
  const refusal = refuseNameSegment(name);

  if (refusal !== undefined) {
    throw new Error(`${name} cannot name a project. ${refusal}`);
  }

  const entries = await entriesIn(root);

  if (entries.length > 0) {
    throw new Error(`${root} is not empty. ket creates a project, it does not adopt one`);
  }

  return { root, key: deriveProjectKey(basename(root)) };
}
