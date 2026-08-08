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

function fromScope(listing: string, scope: string): string[] {
  return listing
    .split('\n')
    .filter((line) => line.split('\t')[0] === scope)
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
  it('reads the identity file the suite carries and nothing the machine keeps', async () => {
    const listing = await gitRan(['config', '--list', '--show-scope']);

    expect(fromScope(listing, 'global')).toStrictEqual([
      'user.name=ket suite',
      'user.email=suite@ket.invalid',
      'commit.gpgsign=false',
    ]);
    expect(fromScope(listing, 'system')).toStrictEqual([]);
  });

  it('records the suite identity on a plain commit', async () => {
    await writeFile(join(root, 'answer.ts'), 'export const answer = 1;\n');
    await gitRan(['add', '.']);
    await gitRan(['commit', '-m', 'the base']);

    const author = await gitRan(['log', '-1', '--pretty=%ae']);

    expect(author.trim()).toBe('suite@ket.invalid');
  });

  it('lets a spec override the suite identity the way repository configuration overrides a global file', async () => {
    await writeFile(join(root, 'answer.ts'), 'export const answer = 1;\n');
    await gitRan(['add', '.']);
    await gitRan([
      '-c',
      'user.name=Ada Lovelace',
      '-c',
      'user.email=ada@test',
      'commit',
      '-m',
      'the base',
    ]);

    const author = await gitRan(['log', '-1', '--pretty=%an']);

    expect(author.trim()).toBe('Ada Lovelace');
  });
});
