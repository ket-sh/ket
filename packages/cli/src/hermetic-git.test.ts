import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

let root = '';

async function gitRan(flags: string[]): Promise<string> {
  return new Promise((settle, refuse) => {
    execFile('git', ['-C', root, ...flags], (failed, stdout) => {
      if (failed === null) {
        settle(stdout);
      } else {
        refuse(new Error(failed.message));
      }
    });
  });
}

const HOST_SCOPES = ['global', 'system'];

function borrowedFromHost(listing: string): string[] {
  return listing
    .split('\n')
    .filter((line) => HOST_SCOPES.includes(line.split('\t')[0] ?? ''))
    .map((line) => line.split('\t')[1] ?? '');
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'ket-hermetic-git-'));
  await gitRan(['init', '-b', 'main']);
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('the git a suite spawns', () => {
  it('reads none of the configuration the machine keeps for its owner', async () => {
    const listing = await gitRan(['config', '--list', '--show-scope']);

    expect(borrowedFromHost(listing)).toStrictEqual([]);
  });

  it('records the identity the environment carries, not one the host would lend', async () => {
    await writeFile(join(root, 'answer.ts'), 'export const answer = 1;\n');
    await gitRan(['add', '.']);
    await gitRan(['commit', '-m', 'the base']);

    const author = await gitRan(['log', '-1', '--pretty=%ae']);

    expect(author.trim()).toBe(process.env['GIT_AUTHOR_EMAIL']);
  });
});
