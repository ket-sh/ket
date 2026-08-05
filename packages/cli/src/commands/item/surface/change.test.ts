import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { changeDiff } from './change.ts';

let root = '';

async function git(...flags: string[]): Promise<void> {
  return new Promise((resolveRun, rejectRun) => {
    const scoped = ['-C', root, '-c', 'user.email=surface@test', '-c', 'user.name=surface'];

    execFile('git', [...scoped, ...flags], (failed) => {
      if (failed === null) {
        resolveRun();
      } else {
        rejectRun(new Error(failed.message));
      }
    });
  });
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'ket-change-'));
  await git('init', '-b', 'main');
  await writeFile(join(root, 'answer.ts'), 'export const answer = 1;\n');
  await git('add', '.');
  await git('commit', '-m', 'the base');
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('the change an item answers for', () => {
  it('carries the branch commits and the working tree together', async () => {
    await git('checkout', '-b', 'feature/turn');
    await writeFile(join(root, 'answer.ts'), 'export const answer = 2;\n');
    await git('add', '.');
    await git('commit', '-m', 'the committed turn');
    await writeFile(join(root, 'answer.ts'), 'export const answer = 3;\n');

    const change = await changeDiff(root);

    expect(change).toContain('answer = 2');
    expect(change).toContain('answer = 3');
  });

  it('answers empty for a repository with nothing in flight', async () => {
    expect((await changeDiff(root)).trim()).toBe('');
  });

  it('answers empty outside a repository instead of refusing', async () => {
    const bare = await mkdtemp(join(tmpdir(), 'ket-change-bare-'));

    expect((await changeDiff(bare)).trim()).toBe('');
    await rm(bare, { recursive: true, force: true });
  });
});
