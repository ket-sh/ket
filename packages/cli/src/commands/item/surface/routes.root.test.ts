import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { startSurface } from './server.ts';

let projectRoot = '';

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

async function pageAt(itemDir: string): Promise<string> {
  await mkdir(itemDir, { recursive: true });
  await writeFile(join(itemDir, 'item.yaml'), 'title: The stray item\nstatus: verifying\n');

  const handle = await startSurface(itemDir);
  const page = await (await fetch(handle.address)).text();

  await handle.stop();

  return page;
}

beforeEach(async () => {
  projectRoot = await mkdtemp(join(tmpdir(), 'ket-surface-root-'));
  await git('init', '-b', 'main');
  await writeFile(join(projectRoot, 'app.ts'), 'export const answer = 1;\n');
  await git('add', '.');
  await git('commit', '-m', 'the base');
  await writeFile(join(projectRoot, 'app.ts'), 'export const answer = 2;\n');
});

afterEach(async () => {
  await rm(projectRoot, { recursive: true, force: true });
});

describe('the repository an item claims through its nest', () => {
  it('shows no change to an items directory outside a ket home', async () => {
    const page = await pageAt(join(projectRoot, 'box', 'items', 'K-9'));

    expect(page).toContain('No change to show at this stage.');
    expect(page).not.toContain('class="diff-index"');
  });

  it('shows no change to a ket home holding no items directory', async () => {
    const page = await pageAt(join(projectRoot, '.ket', 'box', 'K-9'));

    expect(page).toContain('No change to show at this stage.');
    expect(page).not.toContain('class="diff-index"');
  });
});
