import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { startSurface } from './server.ts';

let projectRoot = '';
let itemDir = '';

async function git(...flags: string[]): Promise<void> {
  return new Promise((resolveRun, rejectRun) => {
    const scoped = ['-C', projectRoot, '-c', 'user.email=s@t', '-c', 'user.name=s'];

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
  projectRoot = await mkdtemp(join(tmpdir(), 'ket-surface-repo-'));
  itemDir = join(projectRoot, '.ket', 'items', 'K-9');
  await git('init', '-b', 'main');
  await writeFile(join(projectRoot, 'app.ts'), 'export const answer = 1;\n');
  await git('add', '.');
  await git('commit', '-m', 'the base');
  await mkdir(itemDir, { recursive: true });
  await writeFile(join(itemDir, 'item.yaml'), 'title: The nested work\nstatus: verifying\n');
});

afterEach(async () => {
  await rm(projectRoot, { recursive: true, force: true });
});

describe('the change the page carries', () => {
  it('folds the live change of the governing repository into the diff page', async () => {
    await writeFile(join(projectRoot, 'app.ts'), 'export const answer = 2;\n');

    const handle = await startSurface(itemDir);
    const page = await (await fetch(handle.address)).text();

    await handle.stop();
    expect(page).toContain('class="diff-tree"');
    expect(page).toContain('app.ts');
  });

  it('dims the diff while the repository holds nothing in flight', async () => {
    const handle = await startSurface(itemDir);
    const page = await (await fetch(handle.address)).text();

    await handle.stop();
    expect(page).toMatch(/class="nav-item is-empty"[^>]*data-section="diff"/);
  });
});
