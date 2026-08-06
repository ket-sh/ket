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

  it('carries a committed turn even with a clean working tree', async () => {
    await git('checkout', '-b', 'feature/turn');
    await writeFile(join(root, 'late.ts'), 'export const late = true;\n');
    await git('add', '.');
    await git('commit', '-m', 'the committed turn');

    const change = await changeDiff(root);

    expect(change).toContain('late = true');
  });

  it('carries a working change wider than a default process buffer whole', async () => {
    const wide = `export const wide = [\n${"  'kkkkkkkkkkkkkkkk',\n".repeat(80000)}];\n`;

    await writeFile(join(root, 'answer.ts'), wide);

    const change = await changeDiff(root);

    expect(change).toContain("'kkkkkkkkkkkkkkkk',");
    expect(change.length).toBeGreaterThan(1024 * 1024);
  });

  it('spans exactly the work landed since the origin main ref', async () => {
    await writeFile(join(root, 'early.ts'), 'export const early = true;\n');
    await git('add', '.');
    await git('commit', '-m', 'the early turn');
    await git('update-ref', 'refs/remotes/origin/main', 'HEAD');
    await writeFile(join(root, 'late.ts'), 'export const late = true;\n');
    await git('add', '.');
    await git('commit', '-m', 'the late turn');

    const change = await changeDiff(root);

    expect(change).toContain('late = true');
    expect(change).not.toContain('early = true');
  });
});

describe('the change a repository with nothing to fold answers', () => {
  it('folds no committed work when no base branch answers, whatever branches exist', async () => {
    await git('branch', '-m', 'work');
    await git('branch', 'undefined');
    await writeFile(join(root, 'answer.ts'), 'export const answer = 2;\n');
    await git('add', '.');
    await git('commit', '-m', 'the turn without a base');

    const change = await changeDiff(root);

    expect(change.trim()).toBe('');
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
