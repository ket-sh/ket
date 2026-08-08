import type { Readable } from 'node:stream';

import { readFile } from 'node:fs/promises';
import { text } from 'node:stream/consumers';

export interface ProseFlags {
  description: string | undefined;
  file: string | undefined;
}

export type ProseReading = { prose: string } | { refused: string };

async function readProse(path: string): Promise<ProseReading> {
  const found = await readFile(path, 'utf8').catch(() => undefined);

  return found === undefined
    ? { refused: `${path} is not a file this repository can read` }
    : { prose: found };
}

export async function proseFrom(flags: ProseFlags, piped: Readable): Promise<ProseReading> {
  if (flags.description !== undefined && flags.file !== undefined) {
    return { refused: '--description and --file both say where the prose comes from' };
  }

  if (flags.description !== undefined) {
    return { prose: flags.description };
  }

  return flags.file === undefined ? { prose: await text(piped) } : readProse(flags.file);
}
