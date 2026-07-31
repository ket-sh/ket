import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { PresetItem } from './item.ts';

import { writes } from './item.ts';
import { shippedFilesOf } from './shipped.ts';

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

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'ket-shipped-'));

  await mkdir(join(root, 'files', 'source'), { recursive: true });
  await writeFile(join(root, 'files', 'knip.json'), '{}\n', 'utf8');
  await writeFile(join(root, 'files', 'source', 'main.ts'), "export const a = 'b';\n", 'utf8');
  await writeFile(join(root, 'files', 'unpromised.json'), 'null\n', 'utf8');
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('the files a preset ships', () => {
  it('reads the bytes of every file the item promises', async () => {
    const item = itemPromising([writes('knip.json', 'knip.json')]);

    expect(await shippedFilesOf(item, root)).toStrictEqual({ 'files/knip.json': '{}\n' });
  });

  it('reads a file the preset ships from inside a directory', async () => {
    const item = itemPromising([writes('source/main.ts', 'src/main.ts')]);

    expect(await shippedFilesOf(item, root)).toStrictEqual({
      'files/source/main.ts': "export const a = 'b';\n",
    });
  });

  it('reads what an integration ships as well as what the preset always ships', async () => {
    const item = {
      ...itemPromising([writes('knip.json', 'knip.json')]),
      integrations: [
        {
          name: 'codecov',
          asks: 'codecov?',
          files: [writes('source/main.ts', 'src/main.ts')],
        },
      ],
    };

    expect(Object.keys(await shippedFilesOf(item, root))).toStrictEqual([
      'files/knip.json',
      'files/source/main.ts',
    ]);
  });

  it('reads nothing the item never promised', async () => {
    const item = itemPromising([writes('knip.json', 'knip.json')]);

    expect(Object.keys(await shippedFilesOf(item, root))).not.toContain('files/unpromised.json');
  });

  it('names the paths in one order whatever order the item declares them', async () => {
    const declared = itemPromising([
      writes('source/main.ts', 'src/main.ts'),
      writes('knip.json', 'knip.json'),
    ]);

    expect(Object.keys(await shippedFilesOf(declared, root))).toStrictEqual([
      'files/knip.json',
      'files/source/main.ts',
    ]);
  });

  it('refuses a promised file that sits nowhere on disk', async () => {
    const item = itemPromising([writes('nowhere.json', 'nowhere.json')]);

    await expect(shippedFilesOf(item, root)).rejects.toThrow('nowhere.json');
  });
});
