import { readFile, readdir } from 'node:fs/promises';
import { basename, join } from 'node:path';

import type { BlastFiles } from './blast.ts';
import type { ItemSurface } from './page.ts';

const yamlLine = (source: string | undefined, field: string): string | undefined => {
  if (source === undefined) {
    return undefined;
  }

  const found = new RegExp(`^${field}: (.+)$`, 'm').exec(source);

  return found === null ? undefined : String(found[1]).trim();
};

export async function readArtifact(itemDir: string, name: string): Promise<string | undefined> {
  return readFile(join(itemDir, name), 'utf8').then(
    (content) => content,
    () => undefined,
  );
}

async function featuresOf(itemDir: string): Promise<{ name: string; source: string }[]> {
  const names = await readdir(join(itemDir, 'features')).catch(() => undefined);

  if (names === undefined) {
    return [];
  }

  return Promise.all(
    names
      .filter((name) => name.endsWith('.feature'))
      .map(async (name) => ({
        name,
        source: (await readArtifact(itemDir, join('features', name))) ?? '',
      })),
  );
}

export async function readBlast(itemDir: string): Promise<BlastFiles | undefined> {
  const source = await readArtifact(itemDir, 'blast.d2');

  if (source === undefined) {
    return undefined;
  }

  return { source, measure: await readArtifact(itemDir, 'blast.json') };
}

export async function readSurface(itemDir: string): Promise<ItemSurface> {
  const manifest = await readArtifact(itemDir, 'item.yaml');

  return {
    key: yamlLine(manifest, 'key') ?? basename(itemDir),
    title: yamlLine(manifest, 'title') ?? basename(itemDir),
    status: yamlLine(manifest, 'status') ?? 'triaged',
    artifacts: {
      spec: await readArtifact(itemDir, 'spec.md'),
      specPlain: await readArtifact(itemDir, 'spec.plain.md'),
      design: await readArtifact(itemDir, 'solution-design.md'),
      designPlain: await readArtifact(itemDir, 'solution-design.plain.md'),
      adr: await readArtifact(itemDir, 'adr.md'),
      adrPlain: await readArtifact(itemDir, 'adr.plain.md'),
      callouts: await readArtifact(itemDir, 'callouts.json'),
      brief: await readArtifact(itemDir, 'change-brief.md'),
      findings: await readArtifact(itemDir, 'findings.md'),
      features: await featuresOf(itemDir),
    },
  };
}
