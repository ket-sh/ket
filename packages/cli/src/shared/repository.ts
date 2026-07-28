import { access } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

export async function isRepositoryRoot(directory: string): Promise<boolean> {
  return access(join(directory, '.git')).then(
    () => true,
    () => false,
  );
}

export async function findRepositoryRoot(startDirectory: string): Promise<string | undefined> {
  let directory = resolve(startDirectory);

  for (;;) {
    if (await isRepositoryRoot(directory)) {
      return directory;
    }

    const parent = dirname(directory);

    if (parent === directory) {
      return undefined;
    }

    directory = parent;
  }
}
