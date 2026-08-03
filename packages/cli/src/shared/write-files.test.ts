import fc from 'fast-check';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { writeFiles } from './write-files.ts';

describe('writing a scaffold into a repository', () => {
  it('creates each file, including the directories above it', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ket-'));

    await writeFiles(root, [
      { path: '.ket/config.ts', contents: 'export default {};\n' },
      { path: '.ket/items/.gitkeep', contents: '' },
    ]);

    await expect(readFile(join(root, '.ket/config.ts'), 'utf8')).resolves.toBe(
      'export default {};\n',
    );
    await expect(readFile(join(root, '.ket/items/.gitkeep'), 'utf8')).resolves.toBe('');
  });

  it('refuses to write outside the repository it was given', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ket-'));

    await expect(writeFiles(root, [{ path: '../escaped.ts', contents: 'nope' }])).rejects.toThrow(
      /outside/,
    );
  });
});

describe('writing bytes', () => {
  it('writes a base64 file as the bytes it encodes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ket-write-'));
    const bytes = Buffer.from([0, 255, 254, 147, 10, 13, 0, 128]);

    await writeFiles(root, [
      { path: 'public/bg.mp4', contents: bytes.toString('base64'), encoding: 'base64' },
    ]);

    expect(await readFile(join(root, 'public', 'bg.mp4'))).toStrictEqual(bytes);
  });

  it('writes any bytes whole from their base64', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uint8Array({ minLength: 1 }), async (raw) => {
        const root = await mkdtemp(join(tmpdir(), 'ket-write-'));

        await writeFiles(root, [
          { path: 'blob.bin', contents: Buffer.from(raw).toString('base64'), encoding: 'base64' },
        ]);

        expect(new Uint8Array(await readFile(join(root, 'blob.bin')))).toStrictEqual(raw);
      }),
    );
  });

  it('keeps writing text as text', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ket-write-'));

    await writeFiles(root, [{ path: 'a.txt', contents: 'plain text' }]);

    expect(await readFile(join(root, 'a.txt'), 'utf8')).toBe('plain text');
  });
});
