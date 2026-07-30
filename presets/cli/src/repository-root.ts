import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const MARKER = 'turbo.json';

export function repositoryRootFrom(start: string): string {
  let walking = start;

  while (!existsSync(join(walking, MARKER))) {
    const above = dirname(walking);

    if (above === walking) {
      throw new Error(`no ${MARKER} above ${start}, so the repository root is unknown`);
    }

    walking = above;
  }

  return walking;
}
