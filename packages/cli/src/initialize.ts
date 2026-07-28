import { basename } from 'node:path';

import { deriveProjectKey } from './project-key.ts';
import { findRepositoryRoot } from './repository.ts';

export interface InitializationPlan {
  root: string;
  key: string | undefined;
}

export async function planInitialization(
  startDirectory: string,
): Promise<InitializationPlan | undefined> {
  const root = await findRepositoryRoot(startDirectory);

  if (root === undefined) {
    return undefined;
  }

  return { root, key: deriveProjectKey(basename(root)) };
}
