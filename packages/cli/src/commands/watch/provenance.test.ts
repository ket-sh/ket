import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { repoFactsFor } from './provenance.ts';

let root = '';

async function git(...flags: string[]): Promise<void> {
  return new Promise((done, failed) => {
    const scoped = ['-C', root, '-c', 'user.email=ada@test', '-c', 'user.name=Ada Lovelace'];

    execFile('git', [...scoped, ...flags], (broke) => {
      if (broke === null) {
        done();
      } else {
        failed(new Error(broke.message));
      }
    });
  });
}

async function fileItem(key: string, at: string): Promise<void> {
  await mkdir(join(root, '.ket', 'items', key), { recursive: true });
  await writeFile(join(root, '.ket', 'items', key, 'item.md'), `title: ${key}\n`);
  await git('add', '.');
  await git('-c', `user.name=Ada Lovelace`, 'commit', '--date', at, '-m', `file ${key}`);
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'ket-provenance-'));
  await git('init', '-b', 'main');
  await writeFile(join(root, 'readme.md'), 'the base\n');
  await git('add', '.');
  await git('commit', '-m', 'the base');
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('who filed an item, read off the repository', () => {
  it('names the author of the commit that first carried the item', async () => {
    await fileItem('K-1', '2026-08-07T08:00:00Z');

    const facts = await repoFactsFor(root, 'K-1');

    expect(facts.filed?.by).toBe('Ada Lovelace');
  });

  it('dates the filing by that first commit, not by any later one', async () => {
    await fileItem('K-1', '2026-08-07T08:00:00Z');
    await writeFile(join(root, '.ket', 'items', 'K-1', 'spec.md'), 'a spec\n');
    await git('add', '.');
    await git('commit', '--date', '2026-08-07T11:00:00Z', '-m', 'write the spec');

    const facts = await repoFactsFor(root, 'K-1');

    expect(facts.filed?.at.startsWith('2026-08-07T08:00:00')).toBe(true);
  });

  it('names nobody for an item the repository has never committed', async () => {
    expect((await repoFactsFor(root, 'K-9')).filed).toBeUndefined();
  });

  it('names nobody outside a repository rather than refusing', async () => {
    const bare = await mkdtemp(join(tmpdir(), 'ket-no-repo-'));

    expect((await repoFactsFor(bare, 'K-1')).filed).toBeUndefined();
    await rm(bare, { recursive: true, force: true });
  });
});

describe('the branch the work sits on', () => {
  it('names no branch while the checkout rests on the default one', async () => {
    await fileItem('K-1', '2026-08-07T08:00:00Z');

    expect((await repoFactsFor(root, 'K-1')).branch).toBeUndefined();
  });

  it('names the working branch and counts the commits it holds alone', async () => {
    await git('checkout', '-b', 'feat/watched');
    await fileItem('K-1', '2026-08-07T08:00:00Z');
    await writeFile(join(root, 'readme.md'), 'a turn\n');
    await git('add', '.');
    await git('commit', '-m', 'a turn');

    expect((await repoFactsFor(root, 'K-1')).branch).toStrictEqual({
      name: 'feat/watched',
      commits: 2,
    });
  });

  it('names no branch outside a repository', async () => {
    const bare = await mkdtemp(join(tmpdir(), 'ket-no-repo-'));

    expect((await repoFactsFor(bare, 'K-1')).branch).toBeUndefined();
    await rm(bare, { recursive: true, force: true });
  });
});
