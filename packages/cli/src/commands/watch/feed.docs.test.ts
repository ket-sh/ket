import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { boardFeedFor } from './feed.ts';

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

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'ket-feed-docs-'));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('the docs catalog the feed hands the screen', () => {
  it('folds the tracked docs tree into grouped rows', async () => {
    await git('init', '-b', 'main');
    await mkdir(join(root, 'docs'), { recursive: true });
    await writeFile(
      join(root, 'docs', 'handbook.md'),
      '---\ncategory: reference\n---\n\n# The handbook\n',
    );
    await git('add', '.');
    await git('commit', '-m', 'docs: file the handbook');

    const catalog = await boardFeedFor(root).docsCatalog();

    expect(catalog.groups.map((group) => group.label)).toEqual(['reference']);
    expect(catalog.groups[0]?.rows.map((row) => row.name)).toEqual(['handbook']);
  });
});
