import fc from 'fast-check';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { PresetItem } from './item.ts';

import { copies, writes } from './item.ts';
import { shippedFilesOf } from './shipped.ts';

let root = '';

let standing = '';

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
  await writeFile(join(root, 'files', 'Z.txt'), 'Z\n', 'utf8');
  await writeFile(join(root, 'files', 'a.txt'), 'a\n', 'utf8');
  await writeFile(join(root, 'files', 'dual.txt'), 'plain\n', 'utf8');

  standing = await mkdtemp(join(tmpdir(), 'ket-standing-'));

  await mkdir(join(standing, 'files'), { recursive: true });
  await writeFile(join(standing, 'files', 'mise.toml'), '[tools]\n', 'utf8');
  await writeFile(join(standing, 'files', 'knip.json'), 'SHARED\n', 'utf8');
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
  await rm(standing, { recursive: true, force: true });
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
    const item: PresetItem = {
      ...itemPromising([writes('knip.json', 'knip.json')]),
      integrations: [
        {
          name: 'codecov',
          category: 'coverage',
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

describe('the order paths ship in', () => {
  it('orders paths by code unit rather than the machine locale', async () => {
    const declared = itemPromising([writes('a.txt', 'a.txt'), writes('Z.txt', 'Z.txt')]);

    expect(Object.keys(await shippedFilesOf(declared, root))).toStrictEqual([
      'files/Z.txt',
      'files/a.txt',
    ]);
  });

  it('lets the later declaration of a shared path decide how its bytes are read', async () => {
    const item = itemPromising([
      writes('dual.txt', 'first-target'),
      copies('dual.txt', 'second-target'),
    ]);

    const shipped = await shippedFilesOf(item, root);

    expect(shipped['files/dual.txt']).toBe(Buffer.from('plain\n', 'utf8').toString('base64'));
  });
});

describe('a file every preset ships alike', () => {
  it('reads it from where it is kept once, when the preset keeps no copy', async () => {
    const item = itemPromising([writes('mise.toml', 'mise.toml')]);

    expect(await shippedFilesOf(item, root, standing)).toStrictEqual({
      'files/mise.toml': '[tools]\n',
    });
  });

  it('lets a preset that keeps its own copy answer with that one', async () => {
    const item = itemPromising([writes('knip.json', 'knip.json')]);

    expect(await shippedFilesOf(item, root, standing)).toStrictEqual({ 'files/knip.json': '{}\n' });
  });

  it('refuses a promised file neither the preset nor the shared place holds', async () => {
    const item = itemPromising([writes('nowhere.json', 'nowhere.json')]);

    await expect(shippedFilesOf(item, root, standing)).rejects.toThrow();
  });
});

describe('shipping a promise to copy bytes', () => {
  it('carries the bytes as base64', async () => {
    const copyRoot = await mkdtemp(join(tmpdir(), 'ket-shipped-'));
    const bytes = Buffer.from([0, 255, 254, 147, 10, 13, 0, 128]);

    await mkdir(join(copyRoot, 'files', 'hero'), { recursive: true });
    await writeFile(join(copyRoot, 'files', 'hero', 'bg.mp4'), bytes);

    const item = itemPromising([copies('hero/bg.mp4', 'public/bg.mp4')]);
    const shipped = await shippedFilesOf(item, copyRoot);

    expect(shipped['files/hero/bg.mp4']).toBe(bytes.toString('base64'));
  });

  it('carries any bytes whole through the base64 round trip', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uint8Array({ minLength: 1 }), async (raw) => {
        const copyRoot = await mkdtemp(join(tmpdir(), 'ket-shipped-'));

        await mkdir(join(copyRoot, 'files'), { recursive: true });
        await writeFile(join(copyRoot, 'files', 'blob.bin'), raw);

        const item = itemPromising([copies('blob.bin', 'blob.bin')]);
        const shipped = await shippedFilesOf(item, copyRoot);
        const carried = shipped['files/blob.bin'];

        expect(carried).toBeDefined();
        expect(new Uint8Array(Buffer.from(carried ?? '', 'base64'))).toStrictEqual(raw);
      }),
    );
  });
});
