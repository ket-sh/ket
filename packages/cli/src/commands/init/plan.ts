import { access } from 'node:fs/promises';
import { basename, join } from 'node:path';

import { findRepositoryRoot } from '../../shared/repository.ts';
import { deriveProjectKey } from './project-key.ts';

export const KET_DIRECTORY = '.ket';

export interface InitializationPlan {
  root: string;
  key: string | undefined;
  configured: boolean;
}

async function carriesKetDirectory(root: string): Promise<boolean> {
  return access(join(root, KET_DIRECTORY)).then(
    () => true,
    () => false,
  );
}

export async function planInitialization(
  startDirectory: string,
): Promise<InitializationPlan | undefined> {
  const root = await findRepositoryRoot(startDirectory);

  if (root === undefined) {
    return undefined;
  }

  return {
    root,
    key: deriveProjectKey(basename(root)),
    configured: await carriesKetDirectory(root),
  };
}
