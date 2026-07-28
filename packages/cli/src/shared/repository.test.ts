import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { findRepositoryRoot, isRepositoryRoot } from './repository.ts';

async function makeDirectoryTree(...segments: string[]): Promise<string> {
  const base = await mkdtemp(join(tmpdir(), 'ket-'));
  const leaf = join(base, ...segments);

  await mkdir(leaf, { recursive: true });

  return base;
}

describe('resolving the repository root', () => {
  it('finds the directory holding .git when started from a subdirectory', async () => {
    const base = await makeDirectoryTree('packages', 'cli', 'src');

    await mkdir(join(base, '.git'));

    const root = await findRepositoryRoot(join(base, 'packages', 'cli', 'src'));

    expect(root).toBe(base);
  });

  it('finds the root when .git is a worktree file rather than a directory', async () => {
    const base = await makeDirectoryTree('src');

    await writeFile(join(base, '.git'), 'gitdir: /elsewhere/.git/worktrees/one\n');

    const root = await findRepositoryRoot(join(base, 'src'));

    expect(root).toBe(base);
  });

  it('reports a directory holding .git as a root', async () => {
    const base = await makeDirectoryTree('src');

    await mkdir(join(base, '.git'));

    expect(await isRepositoryRoot(base)).toBe(true);
  });

  it('reports a directory without a .git entry as no root', async () => {
    const base = await makeDirectoryTree('src');

    expect(await isRepositoryRoot(base)).toBe(false);
  });

  it('reports no root when no ancestor holds a .git entry', async () => {
    const base = await makeDirectoryTree('nested');

    const root = await findRepositoryRoot(join(base, 'nested'));

    expect(root).toBeUndefined();
  });
});
