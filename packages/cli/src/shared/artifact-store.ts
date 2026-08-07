import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface BlastFiles {
  source: string;
  measure: string | undefined;
}

export async function readArtifact(itemDir: string, name: string): Promise<string | undefined> {
  return readFile(join(itemDir, name), 'utf8').then(
    (content) => content,
    () => undefined,
  );
}

export async function readBlast(itemDir: string): Promise<BlastFiles | undefined> {
  const source = await readArtifact(itemDir, 'blast.d2');

  if (source === undefined) {
    return undefined;
  }

  return { source, measure: await readArtifact(itemDir, 'blast.json') };
}
