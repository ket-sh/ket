import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { PresetItem } from './item.ts';

import { writeContentsModule } from './contents-module.ts';
import { writes } from './item.ts';

let root = '';

function itemPromising(files: PresetItem['files']): PresetItem {
  return {
    $schema: 'https://ui.shadcn.com/schema/registry-item.json',
    name: 'ket-example',
    type: 'registry:item',
    title: 'ket example',
    description: 'A preset written to be read by a test.',
    dependencies: [],
    devDependencies: [],
    files,
    integrations: [],
  };
}

async function moduleWrittenFor(item: PresetItem): Promise<string> {
  await writeContentsModule(item, root);

  return readFile(join(root, 'src', 'contents.generated.ts'), 'utf8');
}

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'ket-contents-'));

  await mkdir(join(root, 'files'), { recursive: true });
  await mkdir(join(root, 'src'), { recursive: true });
  await writeFile(join(root, 'files', 'knip.json'), '{}\n', 'utf8');
  await writeFile(join(root, 'files', 'mise.toml'), '[tools]\n', 'utf8');
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('the module that carries what a preset ships', () => {
  it('carries the bytes of a shipped file under the path that promises it', async () => {
    const written = await moduleWrittenFor(itemPromising([writes('knip.json', 'knip.json')]));

    expect(written).toBe(
      'export const PRESET_CONTENTS: Record<string, string> = {\n' +
        '  "files/knip.json": "{}\\n",\n' +
        '};\n',
    );
  });

  it('carries every file the preset ships, one entry each', async () => {
    const written = await moduleWrittenFor(
      itemPromising([writes('mise.toml', 'mise.toml'), writes('knip.json', 'knip.json')]),
    );

    expect(written).toBe(
      'export const PRESET_CONTENTS: Record<string, string> = {\n' +
        '  "files/knip.json": "{}\\n",\n' +
        '  "files/mise.toml": "[tools]\\n",\n' +
        '};\n',
    );
  });

  it('carries nothing when the preset promises nothing', async () => {
    const written = await moduleWrittenFor(itemPromising([]));

    expect(written).toBe('export const PRESET_CONTENTS: Record<string, string> = {\n\n};\n');
  });

  it('writes the module beside the source the preset already keeps', async () => {
    await writeContentsModule(itemPromising([]), root);

    await expect(readFile(join(root, 'contents.generated.ts'), 'utf8')).rejects.toThrow();
  });
});
