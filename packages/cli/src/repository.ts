import { access } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

async function holdsGitEntry(directory: string): Promise<boolean> {
  try {
    await access(join(directory, '.git'));

    return true;
  } catch {
    return false;
  }
}

export async function findRepositoryRoot(startDirectory: string): Promise<string | undefined> {
  let directory = resolve(startDirectory);

  for (;;) {
    if (await holdsGitEntry(directory)) {
      return directory;
    }

    const parent = dirname(directory);

    if (parent === directory) {
      return undefined;
    }

    directory = parent;
  }
}
