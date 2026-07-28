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
